"""
Phase 5 — Deep Engine Analysis
Extends the IM pipeline's StockfishAnalyzer with depth-40, multi-PV=5 support.
LC0 is not installed; Stockfish depth-40 multi-PV is the sole engine.
"""

import sys
from pathlib import Path
from typing import Optional

import chess
import chess.engine

sys.path.insert(0, str(Path(__file__).parent.parent))
from config import STOCKFISH_THREADS, STOCKFISH_HASH_MB  # noqa: E402

STOCKFISH_PATH = "/opt/homebrew/bin/stockfish"
DEFAULT_DEPTH = 40
DEFAULT_MULTIPV = 5


def _score_to_cp(score: chess.engine.Score) -> float:
    """Convert engine score to centipawns from White's perspective. Mates use ±9999."""
    if score.is_mate():
        return 9999.0 if score.mate() > 0 else -9999.0
    return float(score.score() or 0)


def _pv_to_san(board: chess.Board, pv: list[chess.Move], max_moves: int = 10) -> list[str]:
    sans = []
    b = board.copy()
    for move in pv[:max_moves]:
        try:
            sans.append(b.san(move))
            b.push(move)
        except Exception:
            break
    return sans


class DeepStockfish:
    """
    Stockfish at depth-40, multi-PV=5. Used for targeted analysis of a small
    number of critical positions — not full game analysis (too slow for that).
    """

    def __init__(self, depth: int = DEFAULT_DEPTH, multipv: int = DEFAULT_MULTIPV):
        self.depth = depth
        self.multipv = multipv
        self._engine: Optional[chess.engine.SimpleEngine] = None

    def __enter__(self):
        self._engine = chess.engine.SimpleEngine.popen_uci(STOCKFISH_PATH)
        self._engine.configure({
            "Threads": STOCKFISH_THREADS,
            "Hash": STOCKFISH_HASH_MB,
            "MultiPV": self.multipv,
        })
        return self

    def __exit__(self, *_):
        if self._engine:
            self._engine.quit()
            self._engine = None

    def analyze_position(self, fen: str, depth: Optional[int] = None, multipv: Optional[int] = None) -> list[dict]:
        """
        Analyze a single position at the given depth with multi-PV.

        Returns list of {rank, san, eval_cp, eval_pawns, depth, pv: [san, ...]}, length = multipv.
        Results are from White's perspective (positive = White better).
        """
        assert self._engine is not None, "Use DeepStockfish as a context manager"
        d = depth or self.depth
        mpv = multipv or self.multipv

        board = chess.Board(fen)
        limit = chess.engine.Limit(depth=d)

        # Configure multi-PV on the fly if needed
        if mpv != self.multipv:
            self._engine.configure({"MultiPV": mpv})

        infos = self._engine.analyse(board, limit, multipv=mpv)

        results = []
        for rank, info in enumerate(infos, start=1):
            score = info["score"].white()
            eval_cp = _score_to_cp(score)
            pv = info.get("pv", [])
            best_move = pv[0] if pv else None
            san = board.san(best_move) if best_move else ""
            results.append({
                "rank": rank,
                "san": san,
                "uci": best_move.uci() if best_move else "",
                "eval_cp": round(eval_cp, 1),
                "eval_pawns": round(eval_cp / 100, 2),
                "depth": info.get("depth", d),
                "pv": _pv_to_san(board, pv),
            })

        # Restore multi-PV to default
        if mpv != self.multipv:
            self._engine.configure({"MultiPV": self.multipv})

        return results

    def quick_eval(self, fen: str) -> float:
        """Return single best-move eval in pawns (White's perspective). Fast path."""
        results = self.analyze_position(fen, multipv=1)
        return results[0]["eval_pawns"] if results else 0.0

    def compare_moves(self, fen: str, moves: list[str]) -> list[dict]:
        """
        Evaluate specific candidate moves from a position.
        Returns [{move_san, eval_after_cp, delta_from_best_cp}].
        Useful for verifying novelty candidates without running full multi-PV.
        """
        assert self._engine is not None, "Use DeepStockfish as a context manager"
        board = chess.Board(fen)
        results = []

        best_eval: Optional[float] = None
        for san in moves:
            try:
                move = board.parse_san(san)
                b2 = board.copy()
                b2.push(move)
                info = self._engine.analyse(b2, chess.engine.Limit(depth=self.depth))
                eval_cp = _score_to_cp(info["score"].white())
                if best_eval is None:
                    best_eval = eval_cp
                results.append({
                    "move_san": san,
                    "move_uci": move.uci(),
                    "eval_after_cp": round(eval_cp, 1),
                })
            except Exception as e:
                results.append({"move_san": san, "error": str(e)})

        # Add delta vs best
        if best_eval is not None:
            for r in results:
                if "eval_after_cp" in r:
                    r["delta_from_best_cp"] = round(r["eval_after_cp"] - best_eval, 1)

        return results


def analyze_key_positions(fens: list[str], depth: int = DEFAULT_DEPTH, multipv: int = DEFAULT_MULTIPV) -> dict:
    """
    Run deep multi-PV analysis on a list of FEN strings.
    Returns {fen: [analysis_results]}.
    This is the main entry point for Phase 5.
    """
    results = {}
    with DeepStockfish(depth=depth, multipv=multipv) as sf:
        for i, fen in enumerate(fens):
            print(f"  [{i+1}/{len(fens)}] Analyzing position (depth={depth}, mpv={multipv})...")
            try:
                results[fen] = sf.analyze_position(fen)
                top = results[fen][0]
                print(f"      Best: {top['san']}  eval: {top['eval_pawns']:+.2f}  ({top['depth']}d)")
            except Exception as e:
                print(f"      Error: {e}")
                results[fen] = []
    return results


# ── CLI ───────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import argparse, json

    parser = argparse.ArgumentParser(description="Deep Stockfish analysis of key positions")
    parser.add_argument("--fen", action="append", dest="fens", help="FEN string(s) to analyze")
    parser.add_argument("--depth", type=int, default=DEFAULT_DEPTH)
    parser.add_argument("--multipv", type=int, default=DEFAULT_MULTIPV)
    parser.add_argument("--output", help="Output JSON path")
    args = parser.parse_args()

    if not args.fens:
        args.fens = [chess.STARTING_FEN]

    results = analyze_key_positions(args.fens, depth=args.depth, multipv=args.multipv)

    if args.output:
        Path(args.output).parent.mkdir(parents=True, exist_ok=True)
        Path(args.output).write_text(json.dumps(results, indent=2), encoding="utf-8")
        print(f"  Saved → {args.output}")
    else:
        print(json.dumps(results, indent=2))
