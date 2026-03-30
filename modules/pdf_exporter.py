from __future__ import annotations

import os

from jinja2 import Environment, FileSystemLoader


def export_report_pdf(report_data: dict) -> bytes:
    """Render report_pdf.html template and convert to PDF bytes using WeasyPrint."""
    templates_dir = os.path.join(os.path.dirname(__file__), "..", "templates")
    env = Environment(loader=FileSystemLoader(templates_dir), autoescape=True)
    template = env.get_template("report_pdf.html")
    html_str = template.render(**report_data)

    try:
        import weasyprint  # type: ignore
        return weasyprint.HTML(string=html_str).write_pdf()
    except ImportError:
        raise RuntimeError(
            "WeasyPrint não está instalado. Execute: pip install weasyprint"
        )
