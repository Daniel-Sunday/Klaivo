# Klaivo

AI study companion for students who have stopped trying but haven't stopped caring.

Not the top student. The one using ChatGPT to finish the assignment and learning nothing. The one who gets an answer and still does not understand. Klaivo is built for that student.

## The Problem

Every AI tool gives students the answer and leaves them. It answers fast. They feel smart. They close the app believing they are ready. But the AI never tested them. Never found the gaps. It optimized for the feeling of learning, not the thing itself.

## What Klaivo Does

Klaivo pulls the thinking out of the student. No prompting. No crafting. The AI meets them where they are and forces comprehension — not shortcuts it.

Four modes built around how students actually learn:
- Understand — deep comprehension, not summaries
- Write — structured drafting with examiner awareness
- Prepare — exam strategy and model answers
- Revise — retention, not re-reading

Every response is calibrated to 6 academic levels — from WAEC and UTME to professional certifications (ICAN, ACCA, IELTS, MDCN, Nigerian Law School).

## Stack

- React + Vite + TypeScript + Tailwind (frontend)
- Supabase (database, auth, storage, pgvector for RAG)
- Vercel Edge Functions (all API calls — keys never touch the browser)
- Claude Sonnet (complex reasoning, Write mode, deep answers)
- Gemini 2.5 Flash (lighter tasks, follow-ups, image reading)
- Paystack + Stripe (payments)
- PWA-first

## Status

V1 in active development. Built alone in Owerri, Nigeria.

## Built by

Daniel Chibuihe Sunday — 19-year-old founder and brand identity designer building the AI study tool he needed and never had.
