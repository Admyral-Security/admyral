import ast
import astor
import sys

from admyral.models import Argument, PythonAction
from admyral.typings import JsonValue


def parse_action(module_str: str, action_name: str) -> PythonAction:
    """
    Parse an action function from a module string and return a PythonAction model.

    Args:
        module_str: The module string containing the action function.
        action_name: The name of the action function to parse.

    Returns:
        PythonAction: The parsed action function as a PythonAction model.
    """
    module = ast.parse(module_str)
    module_body = module.body

    # find the action function AST node
    action_node = None
    for node in module_body:
        if (
            isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef))
            and node.name == action_name
        ):
            action_node = node
            break

    if not action_node:
        raise ValueError(f"Action function '{action_name}' not found in module.")

    action_args = collect_action_arguments(action_node)

    # remove the action decorator from the function
    decorator_list = action_node.decorator_list
    action_node.decorator_list = []

    action_model_params = {
        "action_type": action_name,
        "import_statements": "",
        "code": astor.to_source(action_node),
        "arguments": action_args,
    }

    # extract the action decorator arguments
    if (
        len(decorator_list) != 1
        or (
            isinstance(decorator_list[0], ast.Call)
            and decorator_list[0].func.id != "action"
        )
        or (
            isinstance(decorator_list[0], ast.Name) and decorator_list[0].id != "action"
        )
    ):
        raise ValueError("Action function should only have the @action decorator.")
    action_decorator = decorator_list[0]

    decorator_args = {}

    if isinstance(action_decorator, ast.Call):
        for arg in action_decorator.keywords:
            decorator_args[arg.arg] = arg.value

        for string_arg in ["display_name", "display_namespace", "description"]:
            if value := decorator_args.get(string_arg):
                action_model_params[string_arg] = _parse_constant_string_value(
                    value, string_arg
                )

        for list_arg in ["secrets_placeholders", "requirements"]:
            if value := decorator_args.get(list_arg):
                action_model_params[list_arg] = _parse_list_of_strings(value, list_arg)

    # additionally, we must collect the used import statements and their aliases
    # as well as their imported functions
    # note: we automatically collect all imports from admyral or the standard library as well
    requirements_set = (
        set([req.split("==")[0] for req in action_model_params.get("requirements", [])])
        | sys.stdlib_module_names
    )
    requirements_set.add("admyral")
    requirements_set.add("typing")
    action_model_params["import_statements"] = "".join(
        _collect_imports(module_body, requirements_set)
    )

    # filter out stdlib modules from the requirements
    if requirements := action_model_params.get("requirements"):
        action_model_params["requirements"] = [
            req for req in requirements if req not in sys.stdlib_module_names
        ]

    return PythonAction.model_validate(action_model_params)


def _parse_constant_string_value(node: ast.expr, parameter_name: str) -> str:
    if not isinstance(node, ast.Constant) or not isinstance(node.value, str):
        raise ValueError(f"Decorator argument for {parameter_name} must be a string.")
    return node.value


def _parse_list_of_strings(node: ast.expr, parameter_name: str) -> list[str]:
    if not isinstance(node, ast.List):
        raise ValueError(
            f"Decorator argument for {parameter_name} must be a list of strings."
        )
    values = []
    for elt in node.elts:
        if not isinstance(elt, ast.Constant) or not isinstance(elt.value, str):
            raise ValueError(
                f"Decorator argument for {parameter_name} must be a list of strings."
            )
        values.append(elt.value)
    return values


def _collect_imports(
    module_body: list[ast.stmt], requirements_set: set[str]
) -> list[str]:
    imports = list(
        filter(lambda node: isinstance(node, (ast.Import, ast.ImportFrom)), module_body)
    )

    collected_imports = []
    for imp in imports:
        if isinstance(imp, ast.Import):
            for alias in imp.names:
                package_name = alias.name.split(".")[0]
                if package_name in requirements_set:
                    collected_imports.append(
                        astor.code_gen.to_source(ast.Import(names=[alias]))
                    )

        if isinstance(imp, ast.ImportFrom):
            package_name = imp.module.split(".")[0]
            if package_name in requirements_set:
                collected_imports.append(astor.code_gen.to_source(imp))

    return collected_imports


class IsOptionalTypeVisitor(ast.NodeVisitor):
    def __init__(self):
        self.is_optional = False

    def visit_Constant(self, node: ast.Constant):
        if node.value is None:
            self.is_optional = True

    def visit_Subscript(self, node: ast.Subscript):
        if node.value.id == "Optional":
            self.is_optional = True


def is_optional_type(arg_type_ast: ast.arg) -> bool:
    """
    Check whether an argument is optional. An argument is optional if its type is
    explicitly annotated with None or Optional.

    Args:
        arg: The AST node of the argument.

    Returns:
        bool: True if the argument is optional, False otherwise.
    """
    is_optional_visitor = IsOptionalTypeVisitor()
    is_optional_visitor.visit(arg_type_ast)
    return is_optional_visitor.is_optional


def _parse_type_annotation(arg: ast.arg) -> tuple[str, bool, dict[str, str]]:
    """
    Parse the type annotation of an argument, i.e.:

    Annotated[
        <type>,
        ArgumentMetadata(...)
    ]

    Args:
        arg: The AST node of the argument.

    Returns:
        tuple[str, bool, ArgumentMetadata]: The argument type, whether the argument is optional, and the argument metadata.
    """
    from admyral.action import ArgumentMetadata

    # extract argument type and metadata
    subscript = arg.annotation
    if (
        not isinstance(subscript, ast.Subscript)
        or subscript.value.id != "Annotated"
        or not isinstance(subscript.slice, ast.Tuple)
        or len(subscript.slice.elts) != 2
    ):
        raise ValueError(
            "Arguments must be annotated using Annotated[<type>, ArgumentMetadata(...)]."
        )

    arg_type_ast = subscript.slice.elts[0]
    argument_metadata_ast = subscript.slice.elts[1]

    # get type and check whether it is optional
    arg_type = astor.to_source(arg_type_ast).strip()  # TODO: improve this
    is_optional = is_optional_type(arg_type_ast)

    # get ArgumentMetadata info
    if (
        not isinstance(argument_metadata_ast, ast.Call)
        or argument_metadata_ast.func.id != "ArgumentMetadata"
    ):
        raise ValueError(
            "Argument metadata must be provided using ArgumentMetadata(...)."
        )

    arg_metadata_parmas = {}
    for keyword in argument_metadata_ast.keywords:
        if not isinstance(keyword.value, ast.Constant) or not isinstance(
            keyword.value.value, str
        ):
            raise ValueError("Argument metadata parameters must be a string.")
        if keyword.arg in arg_metadata_parmas:
            raise ValueError(
                f"Found duplicate ArgumentMetadata parameter: {keyword.arg}. ArgumentMetadata parameters must be unique."
            )
        arg_metadata_parmas[keyword.arg] = keyword.value.value
    arg_metadata = ArgumentMetadata.model_validate(arg_metadata_parmas)

    return arg_type, is_optional, arg_metadata.model_dump()


def _parse_value(value_ast: ast.expr) -> JsonValue:
    """
    Transform AST value expression into a JSON-compatible value.

    Args:
        value_ast: The AST node of the value expression.

    Returns:
        JsonValue: The JSON-compatible value.
    """
    if isinstance(value_ast, ast.Constant):
        return value_ast.value

    if isinstance(value_ast, ast.List):
        return [_parse_value(elt) for elt in value_ast.elts]

    if isinstance(value_ast, ast.Dict):
        return {
            key.value: _parse_value(value)
            for key, value in zip(value_ast.keys, value_ast.values)
        }

    expr = astor.to_source(value_ast)
    raise ValueError(
        f'Expression "{expr}" as default value not supported. Default value must be JSON-compatible: constant, list, or dict.'
    )


def collect_action_arguments(action_node: ast.FunctionDef) -> list[Argument]:
    """
    Collect the arguments of an action function.

    Args:
        action_node: The AST node of the action function.

    Returns:
        list[Argument]: The collected arguments as Argument models.
    """
    action_def_args = action_node.args

    if action_def_args.vararg:
        raise ValueError("Varargs parameter is not supported for actions.")
    if action_def_args.kwarg:
        raise ValueError("Kwargs parameter is not supported for actions.")

    # Note: the last #defaults elements of args in the args list, are the corresponding default values
    num_of_args_without_default_value = len(action_def_args.args) - len(
        action_def_args.defaults
    )

    arguments = []
    for idx, arg in enumerate(action_node.args.args):
        # check for default value
        default_value = None
        if idx >= num_of_args_without_default_value:
            default_value_idx = idx - num_of_args_without_default_value
            default_value_ast = action_def_args.defaults[default_value_idx]
            default_value = _parse_value(default_value_ast)

        # parse type annotation
        arg_type, is_optional, arg_metadata = _parse_type_annotation(arg)

        arguments.append(
            Argument.model_validate(
                {
                    "arg_name": arg.arg,
                    "display_name": arg_metadata["display_name"],
                    "description": arg_metadata.get("description"),
                    "arg_type": arg_type,
                    "is_optional": is_optional,
                    "default_value": default_value,
                }
            )
        )

    for arg, default_value_ast in zip(
        action_def_args.kwonlyargs, action_def_args.kw_defaults
    ):
        default_value = _parse_value(default_value_ast)
        arg_type, is_optional, arg_metadata = _parse_type_annotation(arg)
        arguments.append(
            Argument.model_validate(
                {
                    "arg_name": arg.arg,
                    "display_name": arg_metadata["display_name"],
                    "description": arg_metadata.get("description"),
                    "arg_type": arg_type,
                    "is_optional": is_optional,
                    "default_value": default_value,
                }
            )
        )

    return arguments
