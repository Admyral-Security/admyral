import ast

from admyral.models import (
    Condition,
)


def compile_condition_str(condition: str) -> Condition:
    """
    Compile condition string to condition expression AST.

    Note: The string should not contain any references but be a pure pythonic condition expression.

    Args:
        condition: Condition string.

    Returns:
        Condition expression AST.
    """
    from admyral.compiler.workflow_compiler import WorkflowCompiler

    return WorkflowCompiler().compile_if_condition_str(condition)


def condition_to_str(condition: ast.expr) -> str:
    """
    Convert condition expression AST to string.

    Args:
        condition: Condition expression AST.

    Returns:
        Condition string.
    """
    return ast.unparse(condition)
