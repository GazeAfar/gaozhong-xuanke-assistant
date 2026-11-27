"""
零外部依赖纯 Python 标准 QR Code (ISO/IEC 18004) SVG 生成器（支持 Version 2/3, ECC-M/L, Byte mode）。
用于为新上线省份生成静态矢量二维码 web/qr-<province>.svg。
"""
import argparse
import sys

# GF(256) with primitive polynomial 0x11d
EXP = [0] * 512
LOG = [0] * 256
_x = 1
for _i in range(255):
    EXP[_i] = _x
    LOG[_x] = _i
    _x <<= 1
    if _x & 0x100:
        _x ^= 0x11D
for _i in range(255, 512):
    EXP[_i] = EXP[_i - 255]


def gf_mul(a, b):
    if a == 0 or b == 0:
        return 0
    return EXP[LOG[a] + LOG[b]]


def rs_generator_poly(nsym):
    g = [1]
    for i in range(nsym):
        ng = [0] * (len(g) + 1)
        for j, coef in enumerate(g):
            ng[j] ^= coef
            ng[j + 1] ^= gf_mul(coef, EXP[i])
        g = ng
    return g


def rs_encode(data, nsym):
    gen = rs_generator_poly(nsym)
    res = list(data) + [0] * nsym
    for i in range(len(data)):
        coef = res[i]
        if coef != 0:
            for j in range(len(gen)):
                res[i + j] ^= gf_mul(gen[j], coef)
    return res[len(data):]


# Version 3 (29x29), ECC Level M: 44 data codewords, 26 EC codewords, 1 block, alignment at (22, 22)
# Capacity in byte mode: 42 bytes (covers all https://xuanke.visc.cn/<province> URLs cleanly)
def encode_qr_v3_m(text: str):
    raw = text.encode("utf-8")
    if len(raw) > 42:
        raise ValueError(f"URL too long for QR v3-M (max 42 bytes, got {len(raw)})")

    bits = []
    # Mode indicator: Byte (0100)
    bits.extend([0, 1, 0, 0])
    # Char count (8 bits for v1-v9)
    for i in range(7, -1, -1):
        bits.append((len(raw) >> i) & 1)
    # Data bytes
    for b in raw:
        for i in range(7, -1, -1):
            bits.append((b >> i) & 1)

    total_data_bits = 44 * 8
    # Terminator (up to 4 zeros)
    for _ in range(min(4, total_data_bits - len(bits))):
        bits.append(0)
    # Pad to byte boundary
    while len(bits) % 8 != 0:
        bits.append(0)

    codewords = []
    for i in range(0, len(bits), 8):
        val = 0
        for j in range(8):
            val = (val << 1) | bits[i + j]
        codewords.append(val)

    pad_bytes = [0xEC, 0x11]
    pi = 0
    while len(codewords) < 44:
        codewords.append(pad_bytes[pi % 2])
        pi += 1

    ec = rs_encode(codewords, 26)
    all_cw = codewords + ec
    stream = []
    for cw in all_cw:
        for i in range(7, -1, -1):
            stream.append((cw >> i) & 1)
    # Remainder bits for Version 3 = 7
    stream.extend([0] * 7)

    size = 29
    grid = [[None] * size for _ in range(size)]
    is_func = [[False] * size for _ in range(size)]

    def set_func(r, c, val):
        if 0 <= r < size and 0 <= c < size:
            grid[r][c] = val
            is_func[r][c] = True

    def place_finder(r0, c0):
        for dr in range(-1, 8):
            for dc in range(-1, 8):
                r, c = r0 + dr, c0 + dc
                if 0 <= r < size and 0 <= c < size:
                    in_outer = 0 <= dr <= 6 and 0 <= dc <= 6
                    on_border = dr in (0, 6) or dc in (0, 6)
                    in_center = 2 <= dr <= 4 and 2 <= dc <= 4
                    set_func(r, c, 1 if (in_outer and (on_border or in_center)) else 0)

    place_finder(0, 0)
    place_finder(0, size - 7)
    place_finder(size - 7, 0)

    # Alignment pattern at (22, 22)
    for dr in range(-2, 3):
        for dc in range(-2, 3):
            v = 1 if (abs(dr) == 2 or abs(dc) == 2 or (dr == 0 and dc == 0)) else 0
            set_func(22 + dr, 22 + dc, v)

    # Timing patterns
    for i in range(8, size - 8):
        set_func(6, i, 1 if i % 2 == 0 else 0)
        set_func(i, 6, 1 if i % 2 == 0 else 0)

    # Dark module
    set_func(4 * 3 + 9, 8, 1)

    # Reserve format info areas
    for i in range(9):
        if not is_func[8][i]:
            set_func(8, i, 0)
        if not is_func[i][8]:
            set_func(i, 8, 0)
    for i in range(8):
        set_func(8, size - 1 - i, 0)
        set_func(size - 1 - i, 8, 0)

    # Place data bits
    idx = 0
    up = True
    c = size - 1
    while c > 0:
        if c == 6:
            c -= 1
        rows = range(size - 1, -1, -1) if up else range(size)
        for r in rows:
            for dc in (0, -1):
                cc = c + dc
                if not is_func[r][cc]:
                    grid[r][cc] = stream[idx] if idx < len(stream) else 0
                    idx += 1
        up = not up
        c -= 2

    def mask_fn(m, r, col):
        if m == 0: return (r + col) % 2 == 0
        if m == 1: return r % 2 == 0
        if m == 2: return col % 3 == 0
        if m == 3: return (r + col) % 3 == 0
        if m == 4: return ((r // 2) + (col // 3)) % 2 == 0
        if m == 5: return ((r * col) % 2) + ((r * col) % 3) == 0
        if m == 6: return (((r * col) % 2) + ((r * col) % 3)) % 2 == 0
        return (((r + col) % 2) + ((r * col) % 3)) % 2 == 0

    def format_bits(ecc_bits, mask_id):
        data = (ecc_bits << 3) | mask_id
        d = data << 10
        gen = 0b10100110111
        for i in range(14, 9, -1):
            if (d >> i) & 1:
                d ^= gen << (i - 10)
        return ((data << 10) | d) ^ 0b101010000010010

    def apply_format(g, mask_id):
        # ECC M = 00
        fmt = format_bits(0b00, mask_id)
        for i in range(6):
            g[8][i] = (fmt >> (14 - i)) & 1
        g[8][7] = (fmt >> 8) & 1
        g[8][8] = (fmt >> 7) & 1
        g[7][8] = (fmt >> 6) & 1
        for i in range(6):
            g[5 - i][8] = (fmt >> (5 - i)) & 1
        for i in range(8):
            g[8][size - 1 - i] = (fmt >> i) & 1
        for i in range(7):
            g[size - 7 + i][8] = (fmt >> (14 - i)) & 1

    def penalty(g):
        score = 0
        # Rule 1: runs >= 5
        for r in range(size):
            run = 1
            for col in range(1, size):
                if g[r][col] == g[r][col - 1]:
                    run += 1
                    if run == 5:
                        score += 3
                    elif run > 5:
                        score += 1
                else:
                    run = 1
        for col in range(size):
            run = 1
            for r in range(1, size):
                if g[r][col] == g[r - 1][col]:
                    run += 1
                    if run == 5:
                        score += 3
                    elif run > 5:
                        score += 1
                else:
                    run = 1
        # Rule 2: 2x2 blocks
        for r in range(size - 1):
            for col in range(size - 1):
                v = g[r][col]
                if v == g[r][col + 1] == g[r + 1][col] == g[r + 1][col + 1]:
                    score += 3
        # Rule 4: balance
        dark = sum(sum(row) for row in g)
        pct = dark * 100 / (size * size)
        score += int(abs(pct - 50) // 5) * 10
        return score

    best_g = None
    best_pen = 10**9
    for m in range(8):
        g = [row[:] for row in grid]
        for r in range(size):
            for col in range(size):
                if not is_func[r][col] and mask_fn(m, r, col):
                    g[r][col] ^= 1
        apply_format(g, m)
        p = penalty(g)
        if p < best_pen:
            best_pen = p
            best_g = g

    return best_g


def render_svg(matrix, quiet=2, scale=8, fg="#1f2937", bg="#ffffff"):
    n = len(matrix)
    vb = n + quiet * 2
    px = vb * scale
    rects = []
    for r in range(n):
        for c in range(n):
            if matrix[r][c]:
                rects.append(f'<rect x="{c + quiet}" y="{r + quiet}" width="1" height="1"/>')
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {vb} {vb}" width="{px}" height="{px}" shape-rendering="crispEdges">'
        f'<rect width="{vb}" height="{vb}" fill="{bg}"/>'
        f'<g fill="{fg}">{"".join(rects)}</g></svg>'
    )


def main():
    parser = argparse.ArgumentParser(description="生成省份分享静态矢量二维码 SVG")
    parser.add_argument("--url", required=True)
    parser.add_argument("--output", required=True)
    args = parser.parse_args()
    matrix = encode_qr_v3_m(args.url)
    svg = render_svg(matrix)
    with open(args.output, "w", encoding="utf-8") as f:
        f.write(svg)
    print(f"[generate-qr-svg] generated {args.output} for {args.url} ({len(matrix)}x{len(matrix)})")


if __name__ == "__main__":
    main()
