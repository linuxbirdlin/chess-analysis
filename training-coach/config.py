from pathlib import Path

# --- Paths ---
PROJECT_ROOT = Path(__file__).parent.parent
TRAINING_COACH_DIR = Path(__file__).parent
AUSTIN_DIR = PROJECT_ROOT / "austin"
OPPONENTS_DIR = PROJECT_ROOT / "opponents"

# --- Stockfish ---
DEPTH_STANDARD = 18
DEPTH_DEEP = 22      # used for Austin's losses and direct encounter games
TIME_STANDARD = 2.0  # seconds per position — caps analysis if depth not reached
TIME_DEEP = 5.0      # seconds per position for deep games
STOCKFISH_THREADS = 6
STOCKFISH_HASH_MB = 1024

# --- Critical moment detection ---
EVAL_SWING_THRESHOLD = 1.0  # pawn units — minimum swing to flag as critical moment
MAX_CRITICAL_MOMENTS = 3    # max moments to annotate per game

# --- Lichess API ---
LICHESS_EXPLORER_URL = "https://explorer.lichess.ovh/lichess"
LICHESS_TABLEBASE_URL = "https://tablebase.lichess.ovh/standard"
LICHESS_API_TIMEOUT = 10    # seconds
TABLEBASE_MAX_PIECES = 7    # only query tablebase when <= this many pieces

# --- Opening explorer ---
EXPLORER_SPEED = "rapid,classical,blitz"
EXPLORER_RATINGS = "1600,1800,2000,2200,2500"
EXPLORER_MIN_GAMES = 5      # ignore book moves with fewer games than this

# --- Weakness tag categories ---
TAGS = [
    "endgame",
    "conversion",
    "king-safety-h-file",
    "opening-prep",
    "tactical-miss",
]

# --- Phase boundaries (by move number) ---
OPENING_END_MOVE = 15
ENDGAME_START_MOVE = 30     # rough heuristic; engine will also check piece count

# --- Players ---
AUSTIN = "Austin"
AUSTIN_LAST = "Lin"
