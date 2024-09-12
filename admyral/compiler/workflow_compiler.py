import ast
import inspect
from typing import TypeVar, Callable, Any, TYPE_CHECKING
import astor
from collections import deque, defaultdict
from copy import deepcopy
from enum import Enum
import tempfile

from admyral.action_registry import ActionRegistry
from admyral.typings import JsonValue
from admyral.models import (
    NodeBase,
    ActionNode,
    UnaryOperator,
    BinaryOperator,
    Condition,
    ConstantConditionExpression,
    UnaryConditionExpression,
    BinaryConditionExpression,
    AndConditionExpression,
    OrConditionExpression,
    IfNode,
    WorkflowDAG,
    WorkflowStart,
    WorkflowWebhookTrigger,
    WorkflowScheduleTrigger,
    WorkflowDefaultArgument,
)
from admyral.compiler.condition_compiler import condition_to_str

if TYPE_CHECKING:
    from admyral.workflow import Workflow


F = TypeVar("F", bound=Callable[..., Any])


START_NODE_ID: str = "start"


class EdgeType(str, Enum):
    DEFAULT = "default"
    TRUE = "true"
    FALSE = "false"


# TODO: Introduce WorkflowCompileError
class WorkflowCompiler:
    def __init__(self) -> None:
        self.variable_to_nodes_mapping: dict[str, list[tuple[str, EdgeType]]] = (
            defaultdict(list)
        )
        self.nodes: dict[str, NodeBase] = {}

    def compile(self, workflow: "Workflow") -> WorkflowDAG:
        if inspect.iscoroutinefunction(workflow.func):
            raise RuntimeError("Async workflows are not yet supported.")

        tree = ast.parse(inspect.getsource(workflow.func))
        function_node = tree.body[0]

        start_node = ActionNode.build_start_node()
        self.nodes[START_NODE_ID] = start_node

        self._check_function_header_for_payload_parameter(workflow.func)
        self.variable_to_nodes_mapping["payload"] = [(START_NODE_ID, EdgeType.DEFAULT)]
        # Compile the workflow
        self._compile_body(function_node.body)

        return self._into_dag(workflow)

    def compile_from_module(self, module_code: str, workflow_name: str) -> WorkflowDAG:
        with tempfile.NamedTemporaryFile() as tmp:
            tmp.write(module_code.encode())
            tmp.seek(0)
            compiled_code = compile(module_code, tmp.name, "exec")
            module_namespace = {}
            exec(compiled_code, module_namespace)
            return module_namespace[workflow_name].compile()

    def compile_if_condition_str(self, condition: str) -> Condition:
        tree = ast.parse(condition)
        if len(tree.body) != 1:
            raise ValueError("Invalid condition string.")
        cond, _ = self._compile_condition_expression(tree.body[0].value)
        return cond

    def _handle_triggers(
        self, workflow: "Workflow"
    ) -> list[WorkflowWebhookTrigger | WorkflowScheduleTrigger]:
        from admyral.workflow import Webhook, Schedule

        contains_webhook = False
        triggers = []
        for trigger in workflow.triggers:
            default_args = [
                WorkflowDefaultArgument(name=k, value=v)
                for k, v in trigger.default_args.items()
            ]

            if isinstance(trigger, Webhook):
                if contains_webhook:
                    raise ValueError("A workflow can only have one webhook trigger.")
                contains_webhook = True
                triggers.append(WorkflowWebhookTrigger(default_args=default_args))
                continue

            if isinstance(trigger, Schedule):
                if trigger.cron:
                    triggers.append(
                        WorkflowScheduleTrigger(
                            cron=trigger.cron, default_args=default_args
                        )
                    )
                    continue

                if trigger.interval_seconds:
                    triggers.append(
                        WorkflowScheduleTrigger(
                            interval_seconds=trigger.interval_seconds,
                            default_args=default_args,
                        )
                    )
                    continue

                if trigger.interval_minutes:
                    triggers.append(
                        WorkflowScheduleTrigger(
                            interval_minutes=trigger.interval_minutes,
                            default_args=default_args,
                        )
                    )
                    continue

                if trigger.interval_hours:
                    triggers.append(
                        WorkflowScheduleTrigger(
                            interval_hours=trigger.interval_hours,
                            default_args=default_args,
                        )
                    )
                    continue

                if trigger.interval_days:
                    triggers.append(
                        WorkflowScheduleTrigger(
                            interval_days=trigger.interval_days,
                            default_args=default_args,
                        )
                    )
                    continue

        return triggers

    def _into_dag(self, workflow: "Workflow") -> WorkflowDAG:
        return WorkflowDAG(
            name=workflow.name,
            description=workflow.description,
            start=WorkflowStart(
                triggers=self._handle_triggers(workflow),
            ),
            dag=self.nodes,
        )

    def _compute_unique_node_id(self, base: str) -> str:
        if base not in self.nodes:
            return base
        for idx in range(1, 1_000):
            id = f"{base}_{idx}"
            if id not in self.nodes:
                return id
        raise RuntimeError(f"Could not find a unique id for node {base}")

    def _check_function_header_for_payload_parameter(self, function: F) -> None:
        workflow_args = inspect.signature(function).parameters
        if len(workflow_args) != 1 or "payload" not in workflow_args:
            raise RuntimeError(
                f'Failed to compile workflow "{function.__name__}" because the workflow function must have exactly one parameter called "payload" and no default value: payload: dict[str, JsonValue]'
            )

        arg_name = workflow_args["payload"].name
        annotation = str(workflow_args["payload"].annotation)
        default = workflow_args["payload"].default

        if (
            arg_name != "payload"
            or annotation != "dict[str, JsonValue]"
            or default != inspect.Parameter.empty
        ):
            raise RuntimeError(
                f'Failed to compile workflow "{function.__name__}" because the workflow function must have exactly one parameter called "payload" and no default value: payload: dict[str, JsonValue]'
            )

    def _connect_node_to_dependencies(
        self,
        node_id: str,
        dependencies: set[str],
        variable_to_nodes_mapping: dict[str, list[tuple[str, EdgeType]]],
    ) -> None:
        for dependency_variable in dependencies:
            for parent_node_id, edge_type in variable_to_nodes_mapping[
                dependency_variable
            ]:
                match edge_type:
                    case EdgeType.DEFAULT:
                        self.nodes[parent_node_id].add_edge(node_id)
                    case EdgeType.TRUE:
                        self.nodes[parent_node_id].add_true_edge(node_id)
                    case EdgeType.FALSE:
                        self.nodes[parent_node_id].add_false_edge(node_id)

    def _compile_body(self, body: list[ast.stmt]) -> None:
        for statement in body:
            if isinstance(statement, ast.Assign):
                self._compile_assign(statement)

            elif isinstance(statement, ast.If):
                if_node_id, emitted_variables, leaf_nodes, if_block_dependencies = (
                    self._compile_if(statement, self.variable_to_nodes_mapping)
                )

                # Connect the if-condition node to the dependencies of the if-block
                if len(if_block_dependencies) > 0:
                    self._connect_node_to_dependencies(
                        if_node_id,
                        if_block_dependencies,
                        self.variable_to_nodes_mapping,
                    )
                else:
                    # No dependencies, add edge from start node
                    self.nodes[0].add_edge(if_node_id)

                # If an action depends on a variable emitted by the if-statement, then we
                # need to conect the action to all the leaf nodes to guarantee for
                # correct execution order because the entire if-condition block must be executed
                # before the action.
                for emitted_variable in emitted_variables:
                    self.variable_to_nodes_mapping[emitted_variable] = leaf_nodes

            elif isinstance(statement, ast.Expr):
                self._compile_expr(statement)

            else:
                raise RuntimeError(
                    f"Unsupported statement in workflow function: {astor.to_source(statement)}"
                )

    def _is_descendant(self, node: str, target: str) -> bool:
        """
        Does a path from node to target exist in the DAG?
        """
        stack = [node]
        while len(stack) > 0:
            current = stack.pop()
            if current == target:
                return True
            if isinstance(self.nodes[current], IfNode):
                stack.extend(self.nodes[current].true_children)
                stack.extend(self.nodes[current].false_children)
            else:
                stack.extend(self.nodes[current].children)
        return False

    def _remove_transitive_dependencies(
        self,
        dependencies: set[str],
        variable_to_nodes_mapping: dict[str, list[tuple[str, EdgeType]]],
    ) -> set[str]:
        """
        Suppose we have an action A which has dependencies on B and C while B has a dependency on C.

                C --
                |   |
                v   |
                B   |
                |   |
                v   |
                A <-

        Due to the transitive nature of dependencies, we can remove C from the dependencies of A
        because due to the dependency on B, A already has an implicit dependency on C.

                C --> B --> A
        """
        removal_set = set()
        for var1 in dependencies:
            # Why is [0] sufficient?
            # Case 1: if var1 is emitted by an action, then len(variable_to_nodes_mapping[var1]) == 1
            # Case 2: if var1 is emitted by an if-condition, then len(variable_to_nodes_mapping[var1]) > 1
            #         because we remember the leaf nodes of the if-condition block as representative for var1.
            #         If an action depends on var1, then it must depend on all the leaf nodes
            #         and, therefore, connects to all of the leaf nodes. Hence, doing one hop starting from any leaf node
            #         will lead to the same action nodes. Consequently, we can just use [0] to get the first representative.
            ancestor_node_id, _ = variable_to_nodes_mapping[var1][0]
            for var2 in dependencies:
                descendant_node_id, _ = variable_to_nodes_mapping[var2][0]
                if ancestor_node_id == descendant_node_id:
                    continue

                if self._is_descendant(ancestor_node_id, descendant_node_id):
                    # if var1 is a descendant of var2, then we can remove var1 because
                    # dependencies are transitive
                    removal_set.add(var1)

        return dependencies - removal_set

    def _compile_call(
        self,
        call: ast.Call,
        variable_to_nodes_mapping: dict[str, list[tuple[str, EdgeType]]],
    ) -> tuple[str, set[str]]:
        function_name = call.func.id
        function_args = call.args
        function_kwargs = call.keywords

        if len(function_args) > 0:
            raise RuntimeError(
                f"Failed to compile {function_name} because positional arguments are not supported. Please use named arguments instead."
            )

        # Check if function_name is a registered action
        if not ActionRegistry.is_registered(function_name):
            raise RuntimeError(
                f'Function "{function_name}" is not an action. Please register the function as an action if you want to use it in the workflow.'
            )

        action_secrets_mapping = {}
        dependencies = set()
        args = {}

        processed_kwargs = set()
        for kwarg in function_kwargs:
            # check for duplicate named arguments
            if kwarg.arg in processed_kwargs:
                raise RuntimeError(
                    f"Failed to compile {function_name} due to duplicate named argument: {kwarg.arg}"
                )
            processed_kwargs.add(kwarg.arg)

            if kwarg.arg == "run_after":
                # add the dependencies enforced by the run_after argument
                run_after = kwarg.value.elts
                for dependency in run_after:
                    if dependency.id not in variable_to_nodes_mapping:
                        raise RuntimeError(
                            f"Failed to compile {function_name} due to unknown dependency: {dependency.id}"
                        )
                    dependencies.add(dependency.id)
                continue

            if kwarg.arg == "secrets":
                # extract the secrets mapping from the secrets argument
                action_secrets_mapping = {
                    secret_placeholder.value: secret_id.value
                    for secret_placeholder, secret_id in zip(
                        kwarg.value.keys, kwarg.value.values
                    )
                }
                continue

            # collect dependencies and construct input args
            arg_name = kwarg.arg
            arg_value = kwarg.value
            new_dependencies, args[arg_name] = self._compile_value(arg_value)
            dependencies |= new_dependencies

        # check that for each placeholder a secret is specified
        registered_action = ActionRegistry.get(function_name)
        if len(action_secrets_mapping) != len(registered_action.secrets_placeholders):
            raise RuntimeError(
                f"Failed to compile {function_name} because provided secrets do not match secrets placeholders."
            )
        for secret_placeholder in registered_action.secrets_placeholders:
            if secret_placeholder not in action_secrets_mapping:
                raise RuntimeError(
                    f"Failed to compile {function_name} because for placeholder {secret_placeholder} no secret is defined."
                )

        # Remove transitive dependencies to avoid redundant edges in the DAG.
        dependencies = self._remove_transitive_dependencies(
            dependencies, variable_to_nodes_mapping
        )

        node_id = self._compute_unique_node_id(function_name)
        node = ActionNode(
            id=node_id,
            type=function_name,
            args=args,
            secrets_mapping=action_secrets_mapping,
        )
        self.nodes[node_id] = node

        return node_id, dependencies

    def _compile_value(self, expr: ast.expr) -> tuple[set[str], JsonValue]:
        if isinstance(expr, ast.Name):
            return {expr.id}, f"{{{{ {expr.id} }}}}"

        if isinstance(expr, ast.Subscript):
            variable_id, access_path = self._compile_subscript(expr)
            return {variable_id}, access_path

        if isinstance(expr, ast.Constant):
            return set(), expr.value

        if isinstance(expr, ast.List):
            return self._compile_list(expr)

        if isinstance(expr, ast.Dict):
            return self._compile_dict(expr)

        if isinstance(expr, ast.JoinedStr):
            return self._compile_joined_str(expr)

        raise RuntimeError(
            f"Failed to compile {astor.to_source(expr)}. Unsupported argument type."
        )

    def _compile_list(self, list_expr: ast.List) -> tuple[set[str], JsonValue]:
        compiled_json_array = []
        dependencies = set()

        for value in list_expr.elts:
            deps, compiled_value = self._compile_value(value)
            dependencies |= deps
            compiled_json_array.append(compiled_value)

        return dependencies, compiled_json_array

    def _compile_dict(self, dict_expr: ast.Dict) -> tuple[set[str], JsonValue]:
        compiled_json_object = {}
        dependencies = set()

        for key, value in zip(dict_expr.keys, dict_expr.values):
            if not isinstance(key, (ast.Constant, ast.Name, ast.Subscript)):
                raise RuntimeError(
                    f"Failed to compile {astor.to_source(dict_expr)}. Dictionary keys must be constants or string variables."
                )

            deps_key, compiled_key = self._compile_value(key)
            deps_value, compiled_value = self._compile_value(value)

            dependencies |= deps_key
            dependencies |= deps_value

            compiled_json_object[compiled_key] = compiled_value

        return dependencies, compiled_json_object

    def _compile_joined_str(self, joined_str: ast.JoinedStr) -> tuple[set[str], str]:
        dependencies = set()
        output = ""

        for value in joined_str.values:
            if isinstance(value, ast.Constant):
                output += value.value
                continue

            if isinstance(value, ast.FormattedValue):
                if value.conversion != -1:
                    raise RuntimeError(
                        f"Failed to compile {astor.to_source(joined_str)}Conversions are not supported."
                    )

                if isinstance(value.value, ast.Name):
                    dependencies.add(value.value.id)
                    output += f"{{{{ {value.value.id} }}}}"
                    continue

                if isinstance(value.value, ast.Subscript):
                    variable_id, access_path = self._compile_subscript(value.value)
                    dependencies.add(variable_id)
                    output += access_path
                    continue

                raise RuntimeError(
                    f"Failed to compile {astor.to_source(joined_str)}Only variables and subscripts are supported in f-strings."
                )

            raise RuntimeError(
                f"Failed to compile {astor.to_source(joined_str)}Unsupported value in f-string."
            )

        return dependencies, output

    def _get_assign_target(self, assign: ast.Assign) -> str:
        # => we only support a single target
        if len(assign.targets) != 1:
            raise RuntimeError(
                f"Failed to compile {astor.to_source(assign)}Only single target assignments are supported."
            )
        target = assign.targets[0]
        if not isinstance(target, ast.Name):
            raise RuntimeError(
                f"Failed to compile {astor.to_source(assign)}Only single target assignments are supported."
            )
        return target.id

    def _compile_assign(self, assign: ast.Assign) -> None:
        # Expect: NAME = CALL

        # Handle lhs: NAME
        target_variable_id = self._get_assign_target(assign)

        # we might have an await statement. unwrap it
        if isinstance(assign.value, ast.Await):
            func_call = assign.value.value
        else:
            func_call = assign.value

        if not isinstance(func_call, ast.Call):
            raise RuntimeError(
                f"Failed to compile {astor.to_source(assign)}Assignments to variables are only supported for function calls."
            )

        # Compile Action Call

        action_node_id, dependencies = self._compile_call(
            func_call, self.variable_to_nodes_mapping
        )

        # We must also consider the target variable as a dependency.
        # Consider the following workflow:
        # a = act1()
        # a = act2()
        # b = act3(a)
        #
        # If we would not add the target variable as a dependency, then act1 and act2 would be executed in parallel.
        # This would lead to a race condition because act1 could be slower than act2 and overwrite its result.
        # Hence, act3 would use the result of act1 instead of act2.
        if target_variable_id in self.variable_to_nodes_mapping:
            dependencies.add(target_variable_id)

        # Dependencies must be executed before the current action. Hence, add edges from dependencies to the current node.
        if len(dependencies) > 0:
            self._connect_node_to_dependencies(
                action_node_id, dependencies, self.variable_to_nodes_mapping
            )
        else:
            # No dependencies, add edge from start node
            self.nodes[START_NODE_ID].add_edge(action_node_id)

        self.nodes[action_node_id].result_name = target_variable_id

        # Remember the node for the target variable
        # If future actions use target_variable_id then they depend on this node
        self.variable_to_nodes_mapping[target_variable_id] = [
            (action_node_id, EdgeType.DEFAULT)
        ]

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
    ) -> tuple[Condition, set[str]]:
        # AND / OR
        if isinstance(condition_expr, ast.BoolOp):
            deps = set()
            compiled_values = []
            for value in condition_expr.values:
                expr, new_deps = self._compile_condition_expression(value)
                deps |= new_deps
                compiled_values.append(expr)
            if isinstance(condition_expr.op, ast.And):
                return AndConditionExpression(and_expr=compiled_values), deps
            if isinstance(condition_expr.op, ast.Or):
                return OrConditionExpression(or_expr=compiled_values), deps
            raise RuntimeError(
                f"Unsupported boolean operator: {astor.to_source(condition_expr)}"
            )

        # COMPARE: LHS BINARY_OP RHS / LHS is not None / LHS is None
        if isinstance(condition_expr, ast.Compare):
            if len(condition_expr.ops) != 1 or len(condition_expr.comparators) != 1:
                raise RuntimeError(
                    f"Failed to compile {astor.to_source(condition_expr)}Only single comparison operations are supported."
                )

            lhs, deps_lhs = self._compile_condition_expression(condition_expr.left)

            # LHS is not None / LHS is None
            if isinstance(condition_expr.ops[0], (ast.Is, ast.IsNot)):
                op = (
                    UnaryOperator.IS_NONE
                    if isinstance(condition_expr.ops[0], ast.Is)
                    else UnaryOperator.IS_NOT_NONE
                )
                return UnaryConditionExpression(op=op, expr=lhs), deps_lhs

            rhs, deps_rhs = self._compile_condition_expression(
                condition_expr.comparators[0]
            )

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
            else:
                raise RuntimeError(
                    f"Unsupported comparison operator: {astor.to_source(op_node)}"
                )

            return BinaryConditionExpression(
                lhs=lhs, op=op, rhs=rhs
            ), deps_lhs | deps_rhs

        # NOT
        if isinstance(condition_expr, ast.UnaryOp):
            if isinstance(condition_expr.op, ast.Not):
                op = UnaryOperator.NOT
            else:
                raise RuntimeError(
                    f"Unsupported unary operator: {astor.to_source(condition_expr.op)}"
                )
            expr, deps = self._compile_condition_expression(condition_expr.operand)
            return UnaryConditionExpression(op=op, expr=expr), deps

        # VARIABLE
        if isinstance(condition_expr, ast.Name):
            return ConstantConditionExpression(
                value=f"{{{{ {condition_expr.id} }}}}"
            ), {condition_expr.id}

        # JSON CONSTANT
        if isinstance(condition_expr, ast.Constant):
            return ConstantConditionExpression(value=condition_expr.value), set()

        # SUBSCRIPT/REFERENCE
        if isinstance(condition_expr, ast.Subscript):
            variable_id, access_path = self._compile_subscript(condition_expr)
            return ConstantConditionExpression(value=access_path), {variable_id}

        # LIST / DICT
        if isinstance(condition_expr, (ast.List, ast.Dict)):
            deps, value = self._compile_value(condition_expr)
            return ConstantConditionExpression(value=value), deps

        raise RuntimeError(
            f"Unsupported condition expression: {astor.to_source(condition_expr)}"
        )

    def _collect_leaves_and_emitted_variables(
        self, if_node_id: str
    ) -> tuple[list[tuple[str, EdgeType]], set[str]]:
        # Perform BFS to collect all the leaf nodes and emitted variables
        # NOTE: leaf nodes means that we collect the last action node of each possible branch within the if-condition block

        leaf_nodes = set()
        emitted_variables = set()

        queue = deque([if_node_id])

        while len(queue) > 0:
            current_node_id = queue.popleft()
            current_node = self.nodes[current_node_id]

            if isinstance(current_node, ActionNode):
                if current_node.result_name is not None:
                    emitted_variables.add(current_node.result_name)

                if len(current_node.children) == 0:
                    # leaf node
                    leaf_nodes.add((current_node_id, EdgeType.DEFAULT))
                else:
                    queue.extend(current_node.children)

            else:
                # IfNode
                if len(current_node.false_children) > 0:
                    queue.extend(current_node.false_children)
                else:
                    # if the branch is empty, we still add (if_node_if, EdgeType.TRUE) to the leaf nodes
                    # because if an action has a dependency on the if-condition, then it must always be
                    # executed after the if-condition block.
                    #
                    # Consider the following example:
                    # a = act1()
                    # if a > 0:
                    #     a = act2()
                    # b = act3(a)
                    #
                    # If we would not add (if_node_id, EdgeType.FALSE) to the leaf nodes, then graph would look like:
                    #
                    #           <START>
                    #              |
                    #           a = act1() -
                    #              |       |
                    #           if a > 0   |
                    #             T|       |
                    #           a = act2() |
                    #              \      /
                    #            b = act3(a)
                    #
                    # This would mean that we would need to keep a longer history of the variables, so that we can
                    # connect act3(a) to a = act1()
                    # But if we add (if_node_id, EdgeType.FALSE) to the leaf nodes, then the graph would look like:
                    #
                    #           <START>
                    #              |
                    #           a = act1()
                    #              |
                    #           if a > 0
                    #           T/     \F
                    #    a = act2()    |
                    #              \   |
                    #            b = act3(a)
                    #
                    # This way, we can connect act3(a) to if a > 0, which is much simpler since we just remember
                    # the leaves from the if-condition block as a representative for a.
                    leaf_nodes.add((current_node_id, EdgeType.FALSE))

                if len(current_node.true_children) > 0:
                    queue.extend(current_node.true_children)
                else:
                    # Same as for the false branch
                    leaf_nodes.add((current_node_id, EdgeType.TRUE))

        return list(leaf_nodes), emitted_variables

    def _compile_if_branch(
        self,
        statements: list[ast.stmt],
        variable_to_nodes_mapping: dict[str, list[tuple[str, EdgeType]]],
        add_edge_to_if_node: Callable[..., None],
    ) -> set[str]:
        if_block_dependencies = set()

        if_branch_emitted_variables = set()
        local_variable_to_nodes_mapping = deepcopy(variable_to_nodes_mapping)

        for statement in statements:
            if isinstance(statement, (ast.Assign, ast.Expr)):
                # Expected: NAME = CALL or CALL

                if isinstance(statement.value, ast.Constant):
                    # Ignore constants. Example: multi-line comments
                    continue

                # we might have an await statement. unwrap it
                if isinstance(statement.value, ast.Await):
                    # TODO: enable async workflows later
                    # func_call = statement.value.value
                    raise RuntimeError(
                        f"Failed to compile {astor.to_source(statement)}Async functions are not yet supported."
                    )
                else:
                    func_call = statement.value

                if not isinstance(func_call, ast.Call):
                    raise RuntimeError(
                        f"Failed to compile {astor.to_source(func_call)}Unsupported expression."
                    )

                # Compile Action Call
                action_node_id, dependencies = self._compile_call(
                    func_call, local_variable_to_nodes_mapping
                )

                # Remember the dependencies from before the if-condition
                # => required for the edges to the if-condition node
                if_block_dependencies |= dependencies - if_branch_emitted_variables

                # For inside the branch, we only need to consider the dependencies that were
                # emitted within the branch
                dependencies = dependencies & if_branch_emitted_variables

                if len(dependencies) > 0:
                    self._connect_node_to_dependencies(
                        action_node_id, dependencies, local_variable_to_nodes_mapping
                    )
                else:
                    # No new dependencies from inside the branch, add edge from if-condition node
                    add_edge_to_if_node(action_node_id)

                # Handle assignment target
                # only required for NAME = CALL
                if isinstance(statement, ast.Assign):
                    target_variable_id = self._get_assign_target(statement)
                    self.nodes[action_node_id].result_name = target_variable_id
                    local_variable_to_nodes_mapping[target_variable_id] = [
                        (action_node_id, EdgeType.DEFAULT)
                    ]
                    if_branch_emitted_variables.add(
                        self.nodes[action_node_id].result_name
                    )

            elif isinstance(statement, ast.If):
                # Nested If-Condition

                (
                    nested_if_cond_node_id,
                    nested_if_emitted_variables,
                    nested_if_leaf_nodes,
                    nested_if_block_deps,
                ) = self._compile_if(statement, local_variable_to_nodes_mapping)

                # Connect the nested if-condition node to the dependencies of the nested if-condition block
                dependencies = if_branch_emitted_variables & nested_if_block_deps
                if len(dependencies) > 0:
                    self._connect_node_to_dependencies(
                        nested_if_cond_node_id,
                        dependencies,
                        local_variable_to_nodes_mapping,
                    )
                else:
                    # No new dependencies from inside the branch, add direct edge from if-condition node to nested if-condition node
                    add_edge_to_if_node(nested_if_cond_node_id)

                # update local_variable_to_nodes_mapping
                # => the emitted variables are represented by the leaves of the nested if-condition block
                for emitted_variable in nested_if_emitted_variables:
                    local_variable_to_nodes_mapping[emitted_variable] = (
                        nested_if_leaf_nodes
                    )

                # push the emitted variables to the if_branch_emitted_variables because
                # now the if-branch also emits the variables from the nested if-condition block
                if_branch_emitted_variables |= nested_if_emitted_variables

            else:
                raise RuntimeError(
                    f"Unsupported statement in workflow function: {astor.to_source(statement)}"
                )

        return if_block_dependencies

    def _compile_if(
        self,
        if_ast: ast.If,
        variable_to_nodes_mapping: dict[str, list[tuple[str, EdgeType]]],
    ) -> tuple[int, set[str], list[tuple[str, EdgeType]], set[str]]:
        prev_variables_to_nodes_mapping = deepcopy(variable_to_nodes_mapping)

        # compile condition + collect dependencies from the condition
        if_condition, if_block_dependencies = self._compile_condition_expression(
            if_ast.test
        )
        if_condition_str = condition_to_str(if_ast.test)

        if_node_id = self._compute_unique_node_id("if")
        if_node = IfNode(
            id=if_node_id, condition=if_condition, condition_str=if_condition_str
        )
        self.nodes[if_node_id] = if_node

        # Compile true branch
        if_block_dependencies |= self._compile_if_branch(
            if_ast.body, variable_to_nodes_mapping, if_node.add_true_edge
        )
        # Compile false branch
        if_block_dependencies |= self._compile_if_branch(
            if_ast.orelse, variable_to_nodes_mapping, if_node.add_false_edge
        )

        # remove transitive dependencies from if_block_dependencies

        # We need to remove transitive dependencies from the statements before the if-block to avoid
        # connectng the if-block to redundant edges in the DAG.
        #
        # Consider the following example:
        # a = act1()
        # b = act2(a)
        # if a > 0 and b < 0:
        #    ...
        #
        # Then, a and b are both dependencies for the if-block. But since b depends on a, we can
        # remove the edge from a to the if-condition node because the if-condition node already
        # implicilty depends on a due to the dependency on b.
        #
        # NOTE: we need to use the initial variable_to_nodes_mapping because nested if-conditions
        # might have overwritten the variable_to_nodes_mapping.
        if_block_dependencies = self._remove_transitive_dependencies(
            if_block_dependencies, prev_variables_to_nodes_mapping
        )

        # Collect leaf nodes and emitted variables from if-condition block
        leaf_nodes, emitted_variables = self._collect_leaves_and_emitted_variables(
            if_node_id
        )

        return if_node_id, emitted_variables, leaf_nodes, if_block_dependencies

    def _compile_expr(self, expr: ast.Expr) -> None:
        # Expect: CALL

        if isinstance(expr.value, ast.Constant):
            # Ignore constants. Example: multi-line comments
            return

        # we might have an await statement. unwrap it
        if isinstance(expr.value, ast.Await):
            # TODO: enable async workflows later
            # func_call = expr.value.value
            raise RuntimeError(
                f"Failed to compile {astor.to_source(expr)}Async functions are not yet supported."
            )
        else:
            func_call = expr.value

        if not isinstance(func_call, ast.Call):
            raise RuntimeError(
                f"Failed to compile {astor.to_source(func_call)}Unsupported expression."
            )

        # Compile Action Call
        action_node_id, dependencies = self._compile_call(
            func_call, self.variable_to_nodes_mapping
        )
        # Dependencies must be executed before the current action. Hence, add edges from dependencies to the current node.
        if len(dependencies) > 0:
            self._connect_node_to_dependencies(
                action_node_id, dependencies, self.variable_to_nodes_mapping
            )
        else:
            # No dependencies, add edge from start node
            self.nodes[START_NODE_ID].add_edge(action_node_id)
