from __future__ import annotations

from dataclasses import dataclass
from datetime import date
from pathlib import Path

from reportlab.lib.pagesizes import letter
from reportlab.pdfbase.pdfmetrics import stringWidth
from reportlab.pdfgen import canvas


@dataclass
class TextStyle:
    font: str
    size: float
    leading: float


PAGE_WIDTH, PAGE_HEIGHT = letter
MARGIN = 44
CONTENT_WIDTH = PAGE_WIDTH - (MARGIN * 2)

TITLE_STYLE = TextStyle("Helvetica-Bold", 17, 20)
SUBTITLE_STYLE = TextStyle("Helvetica", 8.8, 11)
HEADING_STYLE = TextStyle("Helvetica-Bold", 11.2, 14)
BODY_STYLE = TextStyle("Helvetica", 9.3, 12)
BULLET_STYLE = TextStyle("Helvetica", 9.3, 12)

BULLET_MARK = "- "
BULLET_GAP = 10


def wrap_text(text: str, width: float, style: TextStyle) -> list[str]:
    words = text.strip().split()
    if not words:
        return [""]

    lines: list[str] = []
    current = words[0]
    for word in words[1:]:
        candidate = f"{current} {word}"
        if stringWidth(candidate, style.font, style.size) <= width:
            current = candidate
            continue
        lines.append(current)
        current = word
    lines.append(current)
    return lines


class PageWriter:
    def __init__(self, c: canvas.Canvas) -> None:
        self.c = c
        self.y = PAGE_HEIGHT - MARGIN

    def _ensure_space(self, needed: float) -> None:
        if self.y - needed < MARGIN:
            raise RuntimeError("Layout overflow: content does not fit on one page.")

    def draw_title(self, text: str, subtitle: str) -> None:
        self._ensure_space(TITLE_STYLE.leading + SUBTITLE_STYLE.leading + 8)
        self.c.setFont(TITLE_STYLE.font, TITLE_STYLE.size)
        self.c.drawString(MARGIN, self.y, text)
        self.y -= TITLE_STYLE.leading
        self.c.setFont(SUBTITLE_STYLE.font, SUBTITLE_STYLE.size)
        self.c.drawString(MARGIN, self.y, subtitle)
        self.y -= SUBTITLE_STYLE.leading + 6

    def draw_heading(self, text: str) -> None:
        self._ensure_space(HEADING_STYLE.leading + 2)
        self.c.setFont(HEADING_STYLE.font, HEADING_STYLE.size)
        self.c.drawString(MARGIN, self.y, text)
        self.y -= HEADING_STYLE.leading

    def draw_paragraph(self, text: str, style: TextStyle = BODY_STYLE) -> None:
        lines = wrap_text(text, CONTENT_WIDTH, style)
        self._ensure_space((len(lines) * style.leading) + 2)
        self.c.setFont(style.font, style.size)
        for line in lines:
            self.c.drawString(MARGIN, self.y, line)
            self.y -= style.leading
        self.y -= 2

    def draw_bullets(self, items: list[str], style: TextStyle = BULLET_STYLE) -> None:
        bullet_width = stringWidth(BULLET_MARK, style.font, style.size)
        text_width = CONTENT_WIDTH - bullet_width - BULLET_GAP

        wrapped_items = [wrap_text(item, text_width, style) for item in items]
        line_count = sum(len(lines) for lines in wrapped_items)
        needed = (line_count * style.leading) + (len(items) * 2) + 2
        self._ensure_space(needed)

        self.c.setFont(style.font, style.size)
        for lines in wrapped_items:
            if not lines:
                continue
            self.c.drawString(MARGIN, self.y, BULLET_MARK)
            self.c.drawString(MARGIN + bullet_width + BULLET_GAP, self.y, lines[0])
            self.y -= style.leading
            for line in lines[1:]:
                self.c.drawString(MARGIN + bullet_width + BULLET_GAP, self.y, line)
                self.y -= style.leading
            self.y -= 2

    def spacer(self, points: float) -> None:
        self._ensure_space(points)
        self.y -= points


def build_pdf(output_path: Path) -> None:
    output_path.parent.mkdir(parents=True, exist_ok=True)
    c = canvas.Canvas(str(output_path), pagesize=letter)
    writer = PageWriter(c)

    writer.draw_title(
        "Spartan App - One Page Summary",
        f"Repo evidence snapshot - generated {date.today().isoformat()}",
    )

    writer.draw_heading("What it is")
    writer.draw_paragraph(
        "Spartan is an Expo React Native fitness app that combines workout logging, social interaction, and progress tracking in one mobile experience."
    )
    writer.draw_paragraph(
        "It uses Firebase Auth, Firestore, Storage, and Cloud Functions as its primary backend platform."
    )

    writer.draw_heading("Who it is for")
    writer.draw_paragraph(
        "Primary persona: lifters training with friends or small teams who want accountability through shared workouts, leaderboards, and daily nutrition tracking."
    )

    writer.draw_heading("What it does")
    writer.draw_bullets(
        [
            "Tracks active workouts with exercise selection, sets, templates, and rest timer flows (frontend/components/3_Workout/*).",
            "Supports feed posts with media, likes, comments, and workout attachments (backend/posts/createPost.js and related post modules).",
            "Provides direct/group chat with reactions and image media sharing (frontend/screens/1.1_Messages.js and backend/messages/sendMessageV2.js).",
            "Logs macros and meals by day, including barcode-assisted nutrition lookups (frontend/screens/MacroTracking.js and functions/index.js FatSecret callables).",
            "Runs competition views for ladder, progress, and leaderboards with rank and hexagon stats (frontend/screens/2_Competition.js and functions/index.js).",
            "Handles social/chat notifications through callable and trigger functions plus client listeners (functions/index.js and frontend/state/notificationsStore.js).",
        ]
    )

    writer.draw_heading("How it works (repo-backed architecture)")
    writer.draw_bullets(
        [
            "Client UI: App.js boots a root stack and tab shell (Feed, MacroTracking, Competition, Profile) backed by frontend/screens/*.",
            "Client service layer: backend/*, frontend/services/*, and frontend/logic/* orchestrate Firestore/Storage reads and writes for user, post, workout, and message data.",
            "Backend services: functions/index.js provides callable APIs, Firestore triggers, and scheduled jobs (for example leaderboard rank refresh).",
            "Data flow: UI action -> client module read/write or callable function -> Firestore security rules check (firestore.rules) -> snapshots update app state.",
        ]
    )

    writer.draw_heading("How to run (minimal)")
    writer.draw_bullets(
        [
            "Install dependencies at repo root: npm install.",
            "Set optional OAuth values in .env.example if Google sign-in is needed.",
            "Start Expo dev server: npm run start.",
            "Launch a platform build: npm run ios or npm run android.",
            "Cloud Functions emulator/start command and full local Firebase setup guide: Not found in repo.",
        ]
    )

    c.showPage()
    c.save()


if __name__ == "__main__":
    build_pdf(Path("output/pdf/spartan_app_summary_one_page.pdf"))
