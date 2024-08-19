# TODO: remove
# from admyral.action import action
# from pydantic import BaseModel

# @action
# async def dummy_action1() -> str:
#     print("dummy action 1")
#     return "dummy action 1"

# @action
# async def dummy_action2(s: str) -> dict:
#     return {"a": s}

# @action
# async def dummy_action3() -> dict:
#     return {"a": "hello world"}

# @action
# async def dummy_action4() -> list[dict]:
#     return [
#         {"a": "hello world"},
#         {"b": "hello world"}
#     ]

# class DummyAction1Response(BaseModel):
#     x: str

# @action
# async def dummy_action5(s: str) -> DummyAction1Response:
#     return DummyAction1Response(x="Helloooooo")

# @action
# async def dummy_action6(x: int, s: str) -> dict:
#     return {"a": x, "b": s}

# @action
# def sync_dummy_action() -> str:
#     print("sync dummy action")
#     return "sync dummy action"

# @action
# async def dummy_action7(x: int, y: bool) -> str:
#     return x + 1

# @action
# def dummy_action8(s: str, i: int) -> str:
#     return s + i
