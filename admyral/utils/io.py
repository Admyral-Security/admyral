from typing import TextIO


def file_tail(file: TextIO, n_lines: int) -> tuple[int, list[str]]:
    BLOCK_SIZE = 1024
    # move the cursor to the end of the file
    TO_END_OF_FILE = 2
    INITIAL_CURSOR_OFFSET = 0
    file.seek(INITIAL_CURSOR_OFFSET, TO_END_OF_FILE)

    # get current cursor position (now: end of file)
    block_end_byte = file.tell()
    available_bytes = block_end_byte

    lines_to_go = n_lines
    block_number = -1
    blocks = []

    while lines_to_go > 0 and block_end_byte > 0:
        # try to move to the next block starting from the end of the file
        # towards the beginning of the file
        if block_end_byte - BLOCK_SIZE > 0:
            # we still have sufficient bytes to read a full block

            # set the cursor to the beginning of the block
            file.seek(block_number * BLOCK_SIZE, TO_END_OF_FILE)
            blocks.append(file.read(BLOCK_SIZE))
        else:
            # the remaining bytes are less than a full block
            # so we just set the cursor to the beginning of the file
            file.seek(0, 0)
            # read the remaining bytes
            blocks.append(file.read(block_end_byte))

        # count the lines found in the current block and updates
        # the counters
        lines_found = blocks[-1].count("\n")
        lines_to_go -= lines_found
        block_end_byte -= BLOCK_SIZE
        block_number -= 1

    all_read_text = b"".join(reversed(blocks))
    tail_lines = all_read_text.decode().splitlines()[-n_lines:]

    return available_bytes, tail_lines
