import ast
from typing import TYPE_CHECKING
import astor

from admyral.typings import JsonValue
from admyral.models import (
    UnaryOperator,
    BinaryOperator,
    Condition,
    ConstantConditionExpression,
    UnaryConditionExpression,
    BinaryConditionExpression,
    AndConditionExpression,
    OrConditionExpression,
)

if TYPE_CHECKING:
    pass


# TODO: Introduce WorkflowCompileError
class WorkflowCompiler:
    def compile_if_condition_str(self, condition: str) -> Condition:
        tree = ast.parse(condition)
        if len(tree.body) != 1:
            raise ValueError("Invalid condition string.")
        return self._compile_condition_expression(tree.body[0].value)

    def _compile_value(self, expr: ast.expr) -> JsonValue:
        if isinstance(expr, ast.Name):
            return f"{{{{ {expr.id} }}}}"

        if isinstance(expr, ast.Subscript):
            variable_id, access_path = self._compile_subscript(expr)
            return access_path

        if isinstance(expr, ast.Constant):
            return expr.value

        if isinstance(expr, ast.List):
            return self._compile_list(expr)

        if isinstance(expr, ast.Dict):
            return self._compile_dict(expr)

        raise RuntimeError(
            f"Failed to compile {astor.to_source(expr)}. Unsupported argument type."
        )

    def _compile_list(self, list_expr: ast.List) -> JsonValue:
        compiled_json_array = []

        for value in list_expr.elts:
            deps, compiled_value = self._compile_value(value)
            compiled_json_array.append(compiled_value)

        return compiled_json_array

    def _compile_dict(self, dict_expr: ast.Dict) -> JsonValue:
        compiled_json_object = {}

        for key, value in zip(dict_expr.keys, dict_expr.values):
            if not isinstance(key, (ast.Constant, ast.Name, ast.Subscript)):
                raise RuntimeError(
                    f"Failed to compile {astor.to_source(dict_expr)}. Dictionary keys must be constants or string variables."
                )

            deps_key, compiled_key = self._compile_value(key)
            deps_value, compiled_value = self._compile_value(value)

            compiled_json_object[compiled_key] = compiled_value

        return compiled_json_object

    def _compile_subscript(self, subscript: ast.Subscript) -> tuple[str, str]:
        """
        Compiles a subscript into a reference:

        Example:

            x["a"][1]["c"]

            is compiled to:

            {{ x["a"][1]["c"] }}
        """
        # extract id from Subscript
        current = subscript
        # iterate until we hit the base variable
        while not isinstance(current, ast.Name):
            current = current.value
        variable_id = current.id

        # build the access path
        access_path = ast.unparse(subscript)

        return variable_id, f"{{{{ {access_path} }}}}"

    def _compile_condition_expression(
        self,
        condition_expr: ast.expr,
    ) -> Condition:
        # AND / OR
        if isinstance(condition_expr, ast.BoolOp):
            compiled_values = []
            for value in condition_expr.values:
                expr = self._compile_condition_expression(value)
                compiled_values.append(expr)
            if isinstance(condition_expr.op, ast.And):
                return AndConditionExpression(and_expr=compiled_values)
            if isinstance(condition_expr.op, ast.Or):
                return OrConditionExpression(or_expr=compiled_values)
            raise RuntimeError(
                f"Unsupported boolean operator: {astor.to_source(condition_expr)}"
            )

        # COMPARE: LHS BINARY_OP RHS / LHS is not None / LHS is None
        if isinstance(condition_expr, ast.Compare):
            if len(condition_expr.ops) != 1 or len(condition_expr.comparators) != 1:
                raise RuntimeError(
                    f"Failed to compile {astor.to_source(condition_expr)}Only single comparison operations are supported."
                )

            lhs = self._compile_condition_expression(condition_expr.left)

            # LHS is not None / LHS is None
            if isinstance(condition_expr.ops[0], (ast.Is, ast.IsNot)):
                op = (
                    UnaryOperator.IS_NONE
                    if isinstance(condition_expr.ops[0], ast.Is)
                    else UnaryOperator.IS_NOT_NONE
                )
                return UnaryConditionExpression(op=op, expr=lhs)

            rhs = self._compile_condition_expression(condition_expr.comparators[0])

            op_node = condition_expr.ops[0]
            if isinstance(op_node, ast.Eq):
                op = BinaryOperator.EQUALS
            elif isinstance(op_node, ast.NotEq):
                op = BinaryOperator.NOT_EQUALS
            elif isinstance(op_node, ast.Gt):
                op = BinaryOperator.GREATER_THAN
            elif isinstance(op_node, ast.Lt):
                op = BinaryOperator.LESS_THAN
            elif isinstance(op_node, ast.GtE):
                op = BinaryOperator.GREATER_THAN_OR_EQUAL
            elif isinstance(op_node, ast.LtE):
                op = BinaryOperator.LESS_THAN_OR_EQUAL
            elif isinstance(op_node, ast.In):
                op = BinaryOperator.IN
            elif isinstance(op_node, ast.NotIn):
                op = BinaryOperator.NOT_IN
            else:
                raise RuntimeError(
                    f"Unsupported comparison operator: {astor.to_source(op_node)}"
                )

            return BinaryConditionExpression(lhs=lhs, op=op, rhs=rhs)

        # NOT
        if isinstance(condition_expr, ast.UnaryOp):
            if isinstance(condition_expr.op, ast.Not):
                op = UnaryOperator.NOT
            else:
                raise RuntimeError(
                    f"Unsupported unary operator: {astor.to_source(condition_expr.op)}"
                )
            expr = self._compile_condition_expression(condition_expr.operand)
            return UnaryConditionExpression(op=op, expr=expr)

        # VARIABLE
        if isinstance(condition_expr, ast.Name):
            return ConstantConditionExpression(value=f"{{{{ {condition_expr.id} }}}}")

        # JSON CONSTANT
        if isinstance(condition_expr, ast.Constant):
            return ConstantConditionExpression(value=condition_expr.value)

        # SUBSCRIPT/REFERENCE
        if isinstance(condition_expr, ast.Subscript):
            variable_id, access_path = self._compile_subscript(condition_expr)
            return ConstantConditionExpression(value=access_path)

        # LIST / DICT
        if isinstance(condition_expr, (ast.List, ast.Dict)):
            value = self._compile_value(condition_expr)
            return ConstantConditionExpression(value=value)

        raise RuntimeError(
            f"Unsupported condition expression: {astor.to_source(condition_expr)}"
        )
