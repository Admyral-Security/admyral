import pytest

from admyral.utils.graph import is_dag, calculate_in_deg, calculate_out_deg
from admyral.models import ActionNode, IfNode, ConstantConditionExpression


#########################################################################################################


def test_single_node():
    graph = {"A": []}
    assert is_dag(graph, "A") is True


#########################################################################################################


def test_simple_chain():
    graph = {"A": ["B"], "B": ["C"], "C": []}
    assert is_dag(graph, "A") is True


#########################################################################################################


def test_tree():
    graph = {"A": ["B", "C"], "B": ["D", "E"], "C": ["F"], "D": [], "E": [], "F": []}
    assert is_dag(graph, "A") is True


#########################################################################################################


def test_cycle_self():
    graph = {"A": ["A"]}
    assert is_dag(graph, "A") is False


#########################################################################################################


def test_cycle_simple():
    graph = {"A": ["B"], "B": ["C"], "C": ["A"]}
    assert is_dag(graph, "A") is False


#########################################################################################################


def test_cycle_complex():
    graph = {
        "A": ["B", "C"],
        "B": ["D"],
        "C": ["E"],
        "D": ["F"],
        "E": ["F"],
        "F": ["B"],  # Creates a cycle B -> D -> F -> B
    }
    assert is_dag(graph, "A") is False


#########################################################################################################


def test_diamond_shape():
    graph = {"A": ["B", "C"], "B": ["D"], "C": ["D"], "D": []}
    assert is_dag(graph, "A") is True


#########################################################################################################


def test_invalid_root():
    graph = {"A": ["B"], "B": []}
    with pytest.raises(KeyError):
        is_dag(graph, "C")


#########################################################################################################


def test_empty_graph():
    graph = {}
    with pytest.raises(KeyError):
        is_dag(graph, "A")


#########################################################################################################


def test_calculate_in_deg_simple_chain():
    # A -> B -> C
    start_node = ActionNode.build_start_node()
    start_node.children = ["B"]
    dag = {
        start_node.id: start_node,
        "B": ActionNode(id="B", type="transform", children=["C"]),
        "C": ActionNode(id="C", type="transform", children=[]),
    }

    in_degrees = calculate_in_deg(dag)
    assert in_degrees == {
        "B": 1,
        "C": 1,
    }


#########################################################################################################


def test_calculate_out_deg_simple_chain():
    # A -> B -> C
    start_node = ActionNode.build_start_node()
    start_node.children = ["B"]
    dag = {
        start_node.id: start_node,
        "B": ActionNode(id="B", type="transform", children=["C"]),
        "C": ActionNode(id="C", type="transform", children=[]),
    }

    out_degrees = calculate_out_deg(dag)
    assert out_degrees == {
        "start": 1,
        "B": 1,
        "C": 0,
    }


#########################################################################################################


def test_calculate_in_deg_with_if_node():
    # A -> IF -> B (true branch)  -> D
    #        \-> C (false branch) /
    start_node = ActionNode.build_start_node()
    start_node.children = ["IF"]
    dag = {
        start_node.id: start_node,
        "IF": IfNode(
            id="IF",
            condition=ConstantConditionExpression(value=True),
            condition_str="true",
            true_children=["B"],
            false_children=["C"],
        ),
        "B": ActionNode(id="B", type="transform", children=["D"]),
        "C": ActionNode(id="C", type="transform", children=["D"]),
        "D": ActionNode(id="D", type="transform", children=[]),
    }

    in_degrees = calculate_in_deg(dag)
    assert in_degrees == {
        "IF": 1,
        "B": 1,
        "C": 1,
        "D": 2,
    }


#########################################################################################################


def test_calculate_out_deg_with_if_node():
    # A -> IF -> B (true branch)  -> D
    #        \-> C (false branch) /
    start_node = ActionNode.build_start_node()
    start_node.children = ["IF"]
    dag = {
        start_node.id: start_node,
        "IF": IfNode(
            id="IF",
            condition=ConstantConditionExpression(value=True),
            condition_str="true",
            true_children=["B"],
            false_children=["C"],
        ),
        "B": ActionNode(id="B", type="transform", children=["D"]),
        "C": ActionNode(id="C", type="transform", children=["D"]),
        "D": ActionNode(id="D", type="transform", children=[]),
    }

    out_degrees = calculate_out_deg(dag)
    assert out_degrees == {
        "start": 1,
        "IF_$$$true$$$": 1,
        "IF_$$$false$$$": 1,
        "B": 1,
        "C": 1,
        "D": 0,
    }


#########################################################################################################
