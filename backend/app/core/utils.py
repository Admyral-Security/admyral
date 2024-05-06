from typing import Any


class UnionFind:
    def __init__(self, elements: list[Any]):
        self.parent = {element: element for element in elements}
        self.rank = {element: 0 for element in elements}
    
    def find(self, x: Any) -> Any:
        rep = self.parent[x]
        while rep != self.parent[rep]:
            rep = self.parent[rep]
        
        # path compression
        while x != rep:
            x, self.parent[x] = self.parent[x], rep
        
        return rep

    def union(self, x: Any, y: Any) -> None:
        x_rep = self.find(x)
        y_rep = self.find(y)
        
        if x_rep == y_rep:
            return
        
        if self.rank[x_rep] < self.rank[y_rep]:
            self.parent[x_rep] = y_rep
        elif self.rank[x_rep] > self.rank[y_rep]:
            self.parent[y_rep] = x_rep
        else:
            self.parent[y_rep] = x_rep
            self.rank[x_rep] += 1
