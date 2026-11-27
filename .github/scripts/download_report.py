"""Daily GitHub release download report.

Reads every public repo of OWNER that has releases, compares the download counts
with the previous run (STATE file, kept between runs by the workflow's cache) and
mails an HTML summary. Without SMTP settings it only prints the report, so it can
be tried locally:  python3 .github/scripts/download_report.py
"""
import datetime, html, json, os, smtplib, ssl, sys, urllib.request
from email.message import EmailMessage

OWNER = os.environ.get("OWNER", "serkantkn")
STATE = os.environ.get("STATE_FILE", "download-state.json")
TOKEN = os.environ.get("GITHUB_TOKEN", "")


def api(path):
    req = urllib.request.Request("https://api.github.com" + path,
                                 headers={"Accept": "application/vnd.github+json", "User-Agent": "download-report"})
    if TOKEN:
        req.add_header("Authorization", "Bearer " + TOKEN)
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.load(r)


def collect():
    repos = api(f"/users/{OWNER}/repos?per_page=100&type=owner")
    data = {}
    for repo in sorted(repos, key=lambda r: r["name"].lower()):
        if repo.get("fork") or repo.get("archived"):
            continue
        rels = api(f"/repos/{OWNER}/{repo['name']}/releases?per_page=100")
        rows = []
        for rel in rels:
            if rel.get("draft"):
                continue
            n = sum(a["download_count"] for a in rel["assets"])
            if not rel["assets"]:
                continue
            rows.append({"tag": rel["tag_name"], "pre": rel["prerelease"], "date": (rel["published_at"] or "")[:10],
                         "url": rel["html_url"], "downloads": n})
        if rows:
            data[repo["name"]] = rows
    # most recently released projects first
    return dict(sorted(data.items(), key=lambda kv: max(r["date"] for r in kv[1]), reverse=True))


def build(data, prev):
    today = datetime.date.today().isoformat()
    first_run = not prev
    total = total_delta = 0
    blocks, text = [], [f"GitHub indirme raporu — {today}", ""]
    summary = []
    for name, rows in data.items():
        old = {r["tag"]: r["downloads"] for r in prev.get(name, [])}
        repo_total = sum(r["downloads"] for r in rows)
        repo_delta = sum(r["downloads"] - old.get(r["tag"], 0) for r in rows) if not first_run else 0
        total += repo_total; total_delta += repo_delta
        summary.append((name, repo_total, repo_delta))
        trs = []
        text.append(f"{name}: toplam {repo_total}" + ("" if first_run else f" (+{repo_delta})"))
        for r in rows[:5]:
            d = r["downloads"] - old.get(r["tag"], 0)
            badge = ' <span style="background:#e8f0fe;color:#1a56c4;border-radius:4px;padding:1px 6px;font-size:11px">beta</span>' if r["pre"] else ""
            delta = "" if first_run else (f'<b style="color:#137333">+{d}</b>' if d else '<span style="color:#999">0</span>')
            trs.append(f'<tr><td style="padding:4px 8px"><a href="{html.escape(r["url"])}" style="color:#1a56c4;text-decoration:none">{html.escape(r["tag"])}</a>{badge}</td>'
                       f'<td style="padding:4px 8px;color:#666">{r["date"]}</td>'
                       f'<td style="padding:4px 8px;text-align:right">{r["downloads"]}</td>'
                       f'<td style="padding:4px 8px;text-align:right">{delta}</td></tr>')
            text.append(f"  {r['tag']}{' (beta)' if r['pre'] else ''} {r['date']}: {r['downloads']}" + ("" if first_run else f" (+{d})"))
        more = f'<p style="margin:4px 8px;color:#999;font-size:12px">+{len(rows) - 5} eski sürüm daha</p>' if len(rows) > 5 else ""
        head = f"{repo_total} indirme" + ("" if first_run else f" · bugün +{repo_delta}")
        blocks.append(f'<h3 style="margin:24px 0 6px;font-size:16px">{html.escape(name)} <span style="font-weight:normal;color:#666;font-size:13px">{head}</span></h3>'
                      f'<table style="border-collapse:collapse;font-size:14px;width:100%">'
                      f'<tr style="color:#999;font-size:12px;text-align:left"><th style="padding:4px 8px">Sürüm</th><th style="padding:4px 8px">Tarih</th>'
                      f'<th style="padding:4px 8px;text-align:right">Toplam</th><th style="padding:4px 8px;text-align:right">Son 24 saat</th></tr>'
                      + "".join(trs) + "</table>" + more)
    note = ("<p style='color:#666'>İlk rapor: değişimler yarından itibaren görünecek.</p>" if first_run else "")
    top = (f'<p style="font-size:28px;margin:8px 0"><b>{total}</b> toplam indirme'
           + ("" if first_run else f' · <b style="color:#137333">+{total_delta}</b> son 24 saatte') + "</p>")
    body = (f'<div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:640px;color:#222">'
            f'<h2 style="margin:0">GitHub indirme raporu</h2><p style="color:#666;margin:4px 0">{today}</p>'
            + top + note + "".join(blocks) + "</div>")
    subject = f"İndirme raporu {today}: " + (f"+{total_delta} yeni, toplam {total}" if not first_run else f"toplam {total}")
    return subject, "\n".join(text), body


def send(subject, text, body):
    user, pw, to = os.environ.get("MAIL_USER"), os.environ.get("MAIL_PASSWORD"), os.environ.get("MAIL_TO")
    if not (user and pw and to):
        print("(SMTP ayarı yok; e-posta gönderilmedi)")
        return
    msg = EmailMessage()
    msg["Subject"], msg["From"], msg["To"] = subject, f"İndirme raporu <{user}>", to
    msg.set_content(text)
    msg.add_alternative(body, subtype="html")
    with smtplib.SMTP_SSL(os.environ.get("SMTP_HOST", "smtp.gmail.com"), 465, context=ssl.create_default_context()) as s:
        s.login(user, pw)
        s.send_message(msg)
    print("gönderildi")


def main():
    prev = {}
    if os.path.exists(STATE):
        with open(STATE) as f:
            prev = json.load(f)
    data = collect()
    subject, text, body = build(data, prev)
    print(subject); print(text)
    if "--html" in sys.argv:
        open("report.html", "w").write(body)
    send(subject, text, body)
    with open(STATE, "w") as f:
        json.dump(data, f)


if __name__ == "__main__":
    main()
