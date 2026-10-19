# Training Coach — Q&A

Answer directly after each question. I'll read this file and proceed based on your answers.

---

## 1. Lichess API Access

Can I make HTTP requests from this workspace? (Lichess Opening Explorer and tablebase APIs are free, no key needed.)

**Answer:**


--- yes. The API key is already in .env file

## 2. Depth vs Speed

Current Stockfish pipeline analyzes a full tournament in ~10 minutes at depth ~18–20. Should I add a "deep analysis" mode (depth 25–30) for key games only — Austin's losses and direct encounters — at the cost of longer runtime?

**Answer:**

--- yes

## 3. Review Format

Should the upgraded IM-level annotation go into the existing `review.html` files (replacing/extending them), or as a separate "deep review" report alongside the current ones?

**Answer:**

--- update the existing review.html

## 4. Scope

Is the goal to:
- (a) Upgrade all future reviews going forward, or
- (b) Do a one-time deep review of Austin's most important upcoming games (vs Justin, Aarush, Zachary specifically), or
- (c) Both?

**Answer:**

--- C

## 5. Austin's Known Weaknesses

The existing analysis flags **king safety on the h-file** and **passive endgames** as recurring issues. Are there other specific patterns Austin himself has noticed that I should prioritize in the review?

**Answer:**

--- I think his coaches always he need improve his ending game skill and conversion consistency 

## 6. Opponent Priority

Which opponent is Austin most likely to face next, and should I focus preparation depth there first?

**Answer:** 

--- I think Zachary/Heye/, I will put more USA and Mexico opponents in the list

## 7. Output Audience

Who reads these reports — just Austin, or also a coach? This affects how much explanation vs raw analysis to include.

**Answer:**

--Austin Majority, readable for him. especially for preparation. I am planning to use this document for this north american youth chess championship tournament.