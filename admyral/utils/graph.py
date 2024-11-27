from collections import defaultdict

from admyral.models.workflow import ActionNode, IfNode, LoopNode


def is_dag(adj_list: dict[str, list[str]], root: str) -> bool:
    def dfs(node_id: str, visited: set[str]) -> bool:
        if node_id in visited:
            return False
        visited.add(node_id)
        for child_id in adj_list[node_id]:
            if not dfs(child_id, visited):
                return False
        visited.remove(node_id)
        return True

    return dfs(root, set())


def calculate_in_deg(dag: dict[str, ActionNode | IfNode | LoopNode]) -> dict[str, int]:
    in_deg = defaultdict(int)
    for node in dag.values():
        if isinstance(node, (ActionNode, LoopNode)):
            for child_id in node.children:
                in_deg[child_id] += 1
        else:
            assert isinstance(node, IfNode)
            for child_id in node.true_children + node.false_children:
                in_deg[child_id] += 1
    return in_deg


def calculate_out_deg(dag: dict[str, ActionNode | IfNode | LoopNode]) -> dict[str, int]:
    out_deg = {}
    for node in dag.values():
        if isinstance(node, (ActionNode, LoopNode)):
            out_deg[node.id] = len(node.children)
        else:
            assert isinstance(node, IfNode)
            out_deg[f"{node.id}_$$$true$$$"] = len(node.true_children)
            out_deg[f"{node.id}_$$$false$$$"] = len(node.false_children)
    return out_deg
