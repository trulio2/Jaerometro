from __future__ import annotations

import io
import json
import re
import time
import xml.etree.ElementTree as ET
from datetime import datetime, timedelta, timezone
from email.utils import parsedate_to_datetime
from pathlib import Path
from urllib.parse import quote, urljoin

import openpyxl
import requests

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "front" / "public" / "data" / "dashboard.json"
HEADERS = {"User-Agent": "Mozilla/5.0"}
TIMEOUT = 60
CANDLE_MONTHS = 96
NOW = datetime.now(timezone.utc)


def request_json(url: str):
    last_error = None

    for attempt in range(5):
        try:
            response = requests.get(url, headers=HEADERS, timeout=TIMEOUT)
            response.raise_for_status()
            return response.json()
        except Exception as error:
            last_error = error
            time.sleep(2 + attempt)

    raise last_error


def bcb_series(code: int, months: int = 36):
    start = (NOW - timedelta(days=months * 31)).date()
    end = NOW.date()
    url = (
        f"https://api.bcb.gov.br/dados/serie/bcdata.sgs.{code}/dados"
        f"?formato=json&dataInicial={start.strftime('%d/%m/%Y')}"
        f"&dataFinal={end.strftime('%d/%m/%Y')}"
    )
    rows = request_json(url)
    points = []

    for row in rows:
        date = datetime.strptime(row["data"], "%d/%m/%Y").date()
        value = float(str(row["valor"]).replace(",", "."))
        points.append((date, value))

    points.sort(key=lambda item: item[0])
    return points


def monthly_points(rows, limit: int = 36, scale: float = 1.0):
    by_month = {}

    for date, value in rows:
        by_month[(date.year, date.month)] = value

    selected = sorted(by_month.items())[-limit:]

    return [
        {
            "date": f"{year}-{month:02d}",
            "label": f"{month:02d}/{str(year)[-2:]}",
            "value": round(value * scale, 4),
        }
        for (year, month), value in selected
    ]


def monthly_sum_points(rows, limit: int = 36, scale: float = 1.0):
    by_month = {}

    for date, value in rows:
        key = (date.year, date.month)
        by_month[key] = by_month.get(key, 0.0) + value

    selected = sorted(by_month.items())[-limit:]

    return [
        {
            "date": f"{year}-{month:02d}",
            "label": f"{month:02d}/{str(year)[-2:]}",
            "value": round(value * scale, 4),
        }
        for (year, month), value in selected
    ]


def annual_points(rows, limit: int = 24):
    by_year = {}

    for date, value in rows:
        by_year[date.year] = value

    selected = sorted(by_year.items())[-limit:]

    return [
        {
            "date": f"{year}-01-01",
            "label": str(year),
            "value": round(value, 4),
        }
        for year, value in selected
    ]


def yahoo_monthly(symbol: str, limit: int = 36):
    url = (
        "https://query1.finance.yahoo.com/v8/finance/chart/"
        f"{quote(symbol, safe='')}?range=10y&interval=1mo"
    )
    payload = request_json(url)
    result = payload["chart"]["result"][0]
    timestamps = result.get("timestamp", [])
    quote_data = result["indicators"]["quote"][0]
    opens = quote_data.get("open", [])
    highs = quote_data.get("high", [])
    lows = quote_data.get("low", [])
    closes = quote_data.get("close", [])
    by_month = {}

    for timestamp, open_price, high, low, close in zip(
        timestamps, opens, highs, lows, closes
    ):
        if close is None:
            continue

        date = datetime.fromtimestamp(timestamp, tz=timezone.utc)
        by_month[(date.year, date.month)] = {
            "open": float(open_price or close),
            "high": float(high or close),
            "low": float(low or close),
            "close": float(close),
        }

    selected = sorted(by_month.items())[-limit:]

    return [
        {
            "date": f"{year}-{month:02d}",
            "label": f"{month:02d}/{str(year)[-2:]}",
            "value": round(values["close"], 4),
            "open": round(values["open"], 4),
            "high": round(values["high"], 4),
            "low": round(values["low"], 4),
            "close": round(values["close"], 4),
        }
        for (year, month), values in selected
    ]


def monthly_ohlc_from_daily(rows, limit: int = 36):
    by_month = {}

    for date, value in rows:
        by_month.setdefault((date.year, date.month), []).append(value)

    selected = sorted(by_month.items())[-limit:]

    return [
        {
            "date": f"{year}-{month:02d}",
            "label": f"{month:02d}/{str(year)[-2:]}",
            "value": round(values[-1], 4),
            "open": round(values[0], 4),
            "high": round(max(values), 4),
            "low": round(min(values), 4),
            "close": round(values[-1], 4),
        }
        for (year, month), values in selected
    ]


def combine_ohlc(left, right):
    right_by_date = {point["date"]: point for point in right}
    result = []

    for point in left:
        match = right_by_date.get(point["date"])

        if not match:
            continue

        result.append(
            {
                **point,
                "value": round(point["close"] * match["close"], 4),
                "open": round(point["open"] * match["open"], 4),
                "high": round(point["high"] * match["high"], 4),
                "low": round(point["low"] * match["low"], 4),
                "close": round(point["close"] * match["close"], 4),
            }
        )

    return result


def b3_di_rate(symbol: str):
    url = (
        "https://cotacao.b3.com.br/mds/api/v1/DailyFluctuationHistory/"
        f"{symbol}"
    )
    payload = request_json(url)
    quotes = payload.get("TradgFlr", {}).get("scty", {}).get("lstQtn", [])

    for item in reversed(quotes):
        price = item.get("closPric")

        if price:
            return float(price)

    return None


def focus_series(indicator: str, limit: int = 5):
    filter_value = quote(f"Indicador eq '{indicator}'", safe="")
    url = (
        "https://olinda.bcb.gov.br/olinda/servico/Expectativas/versao/v1/odata/"
        "ExpectativasMercadoAnuais"
        f"?$filter={filter_value}&$orderby=Data%20desc&$top=1000&$format=json"
    )
    rows = request_json(url)["value"]
    rows = [row for row in rows if row.get("baseCalculo") == 0]

    if not rows:
        return []

    latest = max(row["Data"] for row in rows)
    rows = [row for row in rows if row["Data"] == latest]
    rows.sort(key=lambda row: int(row["DataReferencia"]))
    rows = rows[-limit:]

    return [
        {
            "date": row["DataReferencia"],
            "label": row["DataReferencia"],
            "value": round(float(row["Mediana"] or row["Media"]), 4),
        }
        for row in rows
    ]


def janjometro_value():
    url = "https://api.janjometro.com/api/v1/post/sumPublishedCosts"

    try:
        payload = request_json(url)
        return str(payload.get("totalCost", "")).replace("\xa0", " ").strip()
    except Exception:
        return ""


def impostometro_data():
    start = f"01/01/{NOW.year}"
    end = NOW.strftime("%d/%m/%Y")
    headers = {
        **HEADERS,
        "X-Requested-With": "XMLHttpRequest",
        "Accept": "application/json, text/javascript, */*; q=0.01",
        "Referer": "https://impostometro.com.br/",
    }

    try:
        response = requests.get(
            "https://impostometro.com.br/Contador/Brasil",
            params={"dataInicial": start, "dataFinal": end},
            headers=headers,
            timeout=TIMEOUT,
        )
        response.raise_for_status()
        data = response.json()
        raw = data["Data"].split(".")[0]
        local = datetime.strptime(raw, "%Y-%m-%dT%H:%M:%S").replace(
            tzinfo=timezone(timedelta(hours=-3))
        )

        return {
            "value": float(data["Valor"]),
            "incrementPerSecond": float(data["Incremento"]),
            "updatedAt": local.astimezone(timezone.utc)
            .isoformat()
            .replace("+00:00", "Z"),
        }
    except Exception:
        return None


def news_items(limit: int = 6):
    query = quote("Brasil economia dívida inflação juros crise")
    url = (
        "https://news.google.com/rss/search"
        f"?q={query}&hl=pt-BR&gl=BR&ceid=BR:pt-419"
    )
    response = requests.get(url, headers=HEADERS, timeout=TIMEOUT)
    response.raise_for_status()
    root = ET.fromstring(response.content)
    items = []

    for index, item in enumerate(root.findall("./channel/item")):
        title = item.findtext("title") or "Notícia sem título"
        link = item.findtext("link") or ""
        source_node = item.find("source")
        source = (
            source_node.text
            if source_node is not None and source_node.text
            else "Google Notícias"
        )
        published = item.findtext("pubDate")

        try:
            published_at = parsedate_to_datetime(published).astimezone(
                timezone.utc
            ).isoformat().replace("+00:00", "Z")
        except (TypeError, ValueError):
            published_at = NOW.isoformat().replace("+00:00", "Z")

        items.append(
            {
                "id": f"news-{index + 1}",
                "title": title,
                "source": source,
                "url": link,
                "publishedAt": published_at,
            }
        )

        if len(items) >= limit:
            break

    return items


def latest_revenue_report_url(year: int):
    page_url = (
        "https://www.gov.br/receitafederal/pt-br/centrais-de-conteudo/"
        "publicacoes/relatorios/arrecadacao-federal/"
        f"{year}"
    )
    response = requests.get(page_url, headers=HEADERS, timeout=TIMEOUT)
    response.raise_for_status()
    pattern = re.compile(
        r'href="([^"]*analise-mensal-([a-z]{3})-\d{4}-anexo\.xlsx)/view"',
        re.IGNORECASE,
    )
    months = {
        "jan": 1,
        "fev": 2,
        "mar": 3,
        "abr": 4,
        "mai": 5,
        "jun": 6,
        "jul": 7,
        "ago": 8,
        "set": 9,
        "out": 10,
        "nov": 11,
        "dez": 12,
    }
    matches = pattern.findall(response.text)

    if not matches:
        return None

    best_url, best_month = max(
        matches, key=lambda item: months.get(item[1].lower(), 0)
    )
    return urljoin(page_url, best_url) + "/@@download/file"


def revenue_points(limit: int = 36):
    report_url = None

    for year in (NOW.year, NOW.year - 1):
        try:
            report_url = latest_revenue_report_url(year)
        except Exception:
            report_url = None

        if report_url:
            break

    if not report_url:
        return []

    response = requests.get(report_url, headers=HEADERS, timeout=TIMEOUT)
    response.raise_for_status()
    workbook = openpyxl.load_workbook(
        io.BytesIO(response.content), data_only=True, read_only=True
    )
    sheet_name = next(
        (name for name in workbook.sheetnames if name.startswith("Tabela III")),
        None,
    )

    if not sheet_name:
        return []

    sheet = workbook[sheet_name]
    month_names = {
        "JAN": 1,
        "FEV": 2,
        "MAR": 3,
        "ABR": 4,
        "MAIO": 5,
        "MAI": 5,
        "JUN": 6,
        "JUL": 7,
        "AGO": 8,
        "SET": 9,
        "OUT": 10,
        "NOV": 11,
        "DEZ": 12,
    }
    start_year = NOW.year - 5

    for row in sheet.iter_rows(min_row=1, max_row=6, values_only=True):
        text = " ".join(str(value) for value in row if value)
        match = re.search(r"JANEIRO DE (\d{4})", text, re.IGNORECASE)

        if match:
            start_year = int(match.group(1))
            break

    current_year = start_year
    values = []

    for row in sheet.iter_rows(min_row=8, values_only=True):
        first = str(row[0]).strip().upper() if row and row[0] else ""

        if first.startswith("JAN-DEZ"):
            years = re.findall(r"\d{4}", first)

            if years:
                current_year = int(years[-1]) + 1

            continue

        month = month_names.get(first)
        total = row[9] if len(row) > 9 else None

        if month and isinstance(total, (int, float)):
            values.append((current_year, month, float(total)))

    values.sort()
    selected = values[-limit:]

    return [
        {
            "date": f"{year}-{month:02d}",
            "label": f"{month:02d}/{str(year)[-2:]}",
            "value": round(value / 1000, 4),
        }
        for year, month, value in selected
    ]


def number(value: float, decimals: int = 2):
    formatted = f"{value:,.{decimals}f}"
    return formatted.replace(",", "X").replace(".", ",").replace("X", ".")


def signed(value: float, decimals: int = 2, suffix: str = ""):
    signal = "+" if value > 0 else ""
    return f"{signal}{number(value, decimals)}{suffix}"


def change(current: float, previous: float):
    if not previous:
        return 0.0
    return (current / previous - 1) * 100


def diff(current: float, previous: float):
    return current - previous


def latest(points):
    return points[-1]["value"] if points else 0.0


def previous(points):
    return points[-2]["value"] if len(points) > 1 else latest(points)


def trend(value: float):
    if value > 0:
        return "up"
    if value < 0:
        return "down"
    return "flat"


def series_map(points):
    return {point["date"]: point["value"] for point in points}


def as_of(points):
    if points:
        return points[-1]["date"]

    return NOW.isoformat().replace("+00:00", "Z")


def severity_for(value: float):
    if value < 0:
        return "critical"
    return "normal"


def chart_point_severity(points, rule):
    return [
        {**point, "severity": rule(point["value"])}
        for point in points
    ]


def rolling_sum(points, window: int = 12, limit: int = 24):
    result = []

    for index in range(window - 1, len(points)):
        chunk = points[index - window + 1 : index + 1]
        result.append(
            {
                **points[index],
                "value": round(sum(point["value"] for point in chunk), 4),
            }
        )

    return result[-limit:]


def rolling_average(points, window: int = 12, limit: int = 24):
    result = []

    for index in range(window - 1, len(points)):
        chunk = points[index - window + 1 : index + 1]
        result.append(
            {
                **points[index],
                "value": round(
                    sum(point["value"] for point in chunk) / window, 4
                ),
            }
        )

    return result[-limit:]


def rolling_compound(points, window: int = 12, limit: int = 24):
    result = []

    for index in range(window - 1, len(points)):
        chunk = points[index - window + 1 : index + 1]
        factor = 1.0

        for point in chunk:
            factor *= 1 + point["value"] / 100

        result.append(
            {
                **points[index],
                "value": round((factor - 1) * 100, 4),
            }
        )

    return result[-limit:]


def build_alerts(debt, real_rate, flow, ipca, revenue, money, ewz, ibov, focus_ipca):
    alerts = []

    def add(severity, title, message):
        alerts.append(
            {
                "id": f"alert-{len(alerts) + 1}",
                "severity": severity,
                "title": title,
                "message": message,
                "at": NOW.isoformat().replace("+00:00", "Z"),
            }
        )

    if debt > 80:
        add(
            "critical",
            "Dívida Pública em Zona de Risco",
            f"Dívida bruta do governo geral em {number(debt)}% do PIB. "
            "Acima da barreira de 80%, com trajetória de alta.",
        )

    if real_rate > 7:
        add(
            "warning",
            "Juro Real Elevado",
            f"Juro real ex-post em {number(real_rate)}%. "
            "Custo de carregamento da dívida pressiona o resultado fiscal.",
        )

    if flow < 0:
        add(
            "warning",
            "Saída Líquida de Capital",
            f"Fluxo financeiro externo negativo em US$ {number(abs(flow), 1)} bi "
            "no mês. Pressão sobre o câmbio.",
        )

    if ipca > 4.5:
        add(
            "warning",
            "Inflação Acima da Meta",
            f"IPCA acumulado em 12 meses em {number(ipca)}%. "
            "Risco de reprecificação da curva de juros.",
        )

    revenue_change = change(latest(revenue), previous(revenue))

    if revenue_change < -10:
        add(
            "warning",
            "Queda na Arrecadação",
            f"Arrecadação federal caiu {number(abs(revenue_change))}% "
            "na comparação mensal.",
        )

    money_change = change(latest(money), previous(money))

    if money_change > 2:
        add(
            "warning",
            "Expansão Monetária",
            f"Base monetária cresceu {number(money_change)}% no mês. "
            "Acompanhar impacto sobre inflação e câmbio.",
        )

    ewz_change = change(latest(ewz), previous(ewz))
    ibov_change = change(latest(ibov), previous(ibov))

    if ewz_change < -5 or ibov_change < -5:
        add(
            "warning",
            "Estresse no Mercado Acionário",
            f"EWZ {signed(ewz_change)}% e IBOVESPA {signed(ibov_change)}% "
            "no mês. Piora na percepção de risco.",
        )

    if latest(focus_ipca) > 4.5:
        add(
            "warning",
            "Expectativa de Inflação Elevada",
            f"Mediana Focus para o IPCA em {number(latest(focus_ipca))}%. "
            "Expectativas desancoradas da meta.",
        )

    add(
        "info",
        "Sistema Iniciado",
        "Monitoramento macro-financeiro carregado a partir da base pública.",
    )

    return alerts[:6]


def main():
    debt_points = monthly_points(bcb_series(13762))
    usd_points = monthly_points(bcb_series(3698))
    ipca_points = monthly_points(bcb_series(433))
    ipca12_points = monthly_points(bcb_series(13522))
    selic_points = monthly_points(bcb_series(432))
    flow_points = monthly_sum_points(bcb_series(13961), scale=0.001)
    current_month = f"{NOW.year}-{NOW.month:02d}"

    if flow_points and flow_points[-1]["date"] == current_month:
        flow_points = flow_points[:-1]

    interest_points = monthly_points(bcb_series(4616), scale=0.001)
    money_points = monthly_points(bcb_series(1788), scale=0.000001)
    pib_points = monthly_points(bcb_series(4380), scale=0.000001)
    primary_points = monthly_points(bcb_series(5793))
    gdp_growth_points = annual_points(bcb_series(7326, months=24 * 12), limit=24)

    selic_by_month = series_map(selic_points)
    ipca12_by_month = series_map(ipca12_points)
    real_points = []

    for point in ipca12_points:
        selic = selic_by_month.get(point["date"])
        ipca = ipca12_by_month.get(point["date"])

        if selic is None or ipca is None:
            continue

        real = ((1 + selic / 100) / (1 + ipca / 100) - 1) * 100
        real_points.append(
            {
                "date": point["date"],
                "label": point["label"],
                "value": round(real, 4),
            }
        )

    revenue = revenue_points()
    ewz_candles = yahoo_monthly("EWZ", limit=CANDLE_MONTHS)
    ibov_candles = yahoo_monthly("^BVSP", limit=CANDLE_MONTHS)
    btc_usd_candles = yahoo_monthly("BTC-USD", limit=CANDLE_MONTHS)
    usd_candles = monthly_ohlc_from_daily(
        bcb_series(1, months=CANDLE_MONTHS), limit=CANDLE_MONTHS
    )
    btc_brl_candles = combine_ohlc(btc_usd_candles, usd_candles)
    ewz_points = ewz_candles[-36:]
    ibov_points = ibov_candles[-36:]
    focus_ipca = focus_series("IPCA")
    focus_pib = focus_series("PIB Total")
    di_2032 = b3_di_rate("DI1F32")
    di_2035 = b3_di_rate("DI1F35")
    janjometro = janjometro_value()
    impostometro_live = impostometro_data()

    future_rates = []

    if di_2032 is not None:
        future_rates.append(
            {"date": "2032-01-01", "label": "2032", "value": round(di_2032, 4)}
        )

    if di_2035 is not None:
        future_rates.append(
            {"date": "2035-01-01", "label": "2035", "value": round(di_2035, 4)}
        )

    usd_rolling = rolling_average(usd_points)
    ewz_rolling = rolling_average(ewz_points)
    ibov_rolling = rolling_average(ibov_points)
    flow_rolling = rolling_sum(flow_points)
    debt_rolling = rolling_average(debt_points)
    revenue_rolling = rolling_sum(revenue)
    interest_rolling = rolling_sum(interest_points)
    interest_rolling_tri = [
        {**point, "value": round(point["value"] / 1000, 4)}
        for point in interest_rolling
    ]
    primary_12m = primary_points[-24:]
    ipca_rolling = rolling_compound(ipca_points)
    money_rolling = rolling_average(money_points)
    real_rolling = rolling_average(real_points)
    selic_rolling = rolling_average(selic_points)
    pib_rolling = rolling_sum(pib_points)

    debt = latest(debt_points)
    usd = latest(usd_points)
    ipca = latest(ipca12_points)
    selic = latest(selic_points)
    real_rate = latest(real_points)
    flow = latest(flow_points)
    ibov = latest(ibov_points)
    ewz = latest(ewz_points)

    usd_delta = change(usd, previous(usd_points))
    ipca_delta = diff(ipca, previous(ipca12_points))
    selic_delta = diff(selic, previous(selic_points))
    real_delta = diff(real_rate, previous(real_points))
    debt_delta = diff(debt, previous(debt_points))
    ibov_delta = change(ibov, previous(ibov_points))
    ewz_delta = change(ewz, previous(ewz_points))
    flow_change = flow - previous(flow_points)
    interest_12m = latest(interest_rolling)
    interest_delta = change(interest_12m, previous(interest_rolling))

    metrics = [
        {
            "id": "debt",
            "label": "DÍVIDA BRUTA / PIB",
            "description": "Dívida do governo geral",
            "value": f"{number(debt)}%",
            "delta": signed(debt_delta, 2, " p.p."),
            "deltaLabel": "no mês",
            "trend": trend(debt_delta),
            "tone": "negative",
            "severity": "critical" if debt > 80 else "warning",
            "icon": "risk",
            "source": "BCB SGS 13762",
            "updatedAt": as_of(debt_points),
        },
        {
            "id": "usd",
            "label": "DÓLAR",
            "description": "Cotação do dólar em reais",
            "value": f"R$ {number(usd)}",
            "delta": signed(usd_delta, 2, "%"),
            "deltaLabel": "no mês",
            "trend": trend(usd_delta),
            "tone": "negative" if usd_delta > 0 else "positive",
            "severity": "warning" if abs(usd_delta) > 2 else "normal",
            "icon": "currency",
            "source": "BCB SGS 3698",
            "updatedAt": as_of(usd_points),
        },
        {
            "id": "ipca",
            "label": "IPCA 12 MESES",
            "description": "Inflação acumulada em 12 meses",
            "value": f"{number(ipca)}%",
            "delta": signed(ipca_delta, 2, " p.p."),
            "deltaLabel": "no mês",
            "trend": trend(ipca_delta),
            "tone": "positive" if ipca_delta < 0 else "negative",
            "severity": "warning" if ipca > 4.5 else "normal",
            "icon": "inflation",
            "source": "BCB SGS 13522",
            "updatedAt": as_of(ipca12_points),
        },
        {
            "id": "selic",
            "label": "SELIC",
            "description": "Taxa básica de juros",
            "value": f"{number(selic)}%",
            "delta": signed(selic_delta, 2, " p.p."),
            "deltaLabel": "no mês",
            "trend": trend(selic_delta),
            "tone": "neutral" if selic_delta == 0 else "negative" if selic_delta > 0 else "positive",
            "severity": "warning" if selic >= 12 else "normal",
            "icon": "curve",
            "source": "BCB SGS 432",
            "updatedAt": as_of(selic_points),
        },
        {
            "id": "real-rate",
            "label": "JURO REAL EX-POST",
            "description": "Selic descontada da inflação",
            "value": f"{number(real_rate)}%",
            "delta": signed(real_delta, 2, " p.p."),
            "deltaLabel": "no mês",
            "trend": trend(real_delta),
            "tone": "negative" if real_delta > 0 else "positive",
            "severity": "warning" if real_rate > 7 else "normal",
            "icon": "curve",
            "source": "BCB SGS 432 + 13522",
            "updatedAt": as_of(real_points),
        },
        {
            "id": "ibov",
            "label": "IBOVESPA",
            "description": "Índice da bolsa brasileira",
            "value": f"{number(ibov, 0)} pts",
            "delta": signed(ibov_delta, 2, "%"),
            "deltaLabel": "no mês",
            "trend": trend(ibov_delta),
            "tone": "positive" if ibov_delta > 0 else "negative",
            "severity": "warning" if ibov_delta < -5 else "normal",
            "icon": "curve",
            "source": "Yahoo Finance",
            "updatedAt": as_of(ibov_points),
        },
        {
            "id": "ewz",
            "label": "EWZ",
            "description": "ETF Brasil em Nova York",
            "value": f"US$ {number(ewz)}",
            "delta": signed(ewz_delta, 2, "%"),
            "deltaLabel": "no mês",
            "trend": trend(ewz_delta),
            "tone": "positive" if ewz_delta > 0 else "negative",
            "severity": "warning" if ewz_delta < -5 else "normal",
            "icon": "curve",
            "source": "Yahoo Finance",
            "updatedAt": as_of(ewz_points),
        },
        {
            "id": "flow",
            "label": "FLUXO CAMBIAL",
            "description": "Conta financeira líquida",
            "value": f"-US$ {number(abs(flow), 1)} bi" if flow < 0 else f"US$ {number(flow, 1)} bi",
            "delta": "Saída" if flow_change < 0 else "Entrada",
            "deltaLabel": "no mês",
            "trend": "down" if flow_change < 0 else "up",
            "tone": "negative" if flow_change < 0 else "positive",
            "severity": "critical" if flow < -5 else "warning" if flow < 0 else "normal",
            "icon": "flow",
            "source": "BCB SGS 13961",
            "updatedAt": as_of(flow_points),
        },
        {
            "id": "janjometro",
            "label": "JANJÔMETRO",
            "description": "Custo total publicado",
            "value": janjometro or "—",
            "delta": "Total",
            "deltaLabel": "publicado",
            "trend": "flat",
            "tone": "neutral",
            "severity": "normal",
            "icon": "currency",
            "source": "Janjômetro API",
            "updatedAt": NOW.isoformat().replace("+00:00", "Z"),
        },
        {
            "id": "interest",
            "label": "JUROS DA DÍVIDA PAGOS",
            "description": "Juros nominais em 12 meses",
            "value": f"R$ {number(interest_12m / 1000)} tri",
            "delta": signed(interest_delta, 2, "%"),
            "deltaLabel": "no mês",
            "trend": trend(interest_delta),
            "tone": "negative" if interest_delta > 0 else "positive",
            "severity": "warning" if interest_12m >= 1000 else "normal",
            "icon": "risk",
            "source": "BCB SGS 4616",
            "updatedAt": as_of(interest_rolling),
        },
    ]

    flow_rolling_chart = chart_point_severity(
        flow_rolling,
        lambda value: "critical" if value < 0 else "normal",
    )
    debt_rolling_chart = chart_point_severity(
        debt_rolling,
        lambda value: "critical" if value > 80 else "warning" if value > 75 else "normal",
    )
    ipca_rolling_chart = chart_point_severity(
        ipca_rolling,
        lambda value: "critical" if value > 4.5 else "warning" if value > 4 else "normal",
    )
    gdp_growth_chart = chart_point_severity(
        gdp_growth_points,
        lambda value: "critical" if value < 0 else "normal",
    )
    primary_chart_points = chart_point_severity(
        primary_12m,
        lambda value: "critical" if value < 0 else "normal",
    )

    charts = [
        {
            "id": "usd-12m",
            "title": "DÓLAR PTAX — VELAS",
            "subtitle": "Velas mensais (OHLC) com média móvel de 12 meses",
            "kind": "candle",
            "section": "market",
            "series": [
                {
                    "id": "usd",
                    "label": "Dólar PTAX",
                    "color": "#2de2e6",
                    "axis": "left",
                    "decimals": 2,
                    "prefix": "R$ ",
                    "points": usd_candles,
                }
            ],
        },
        {
            "id": "ewz-12m",
            "title": "EWZ — VELAS",
            "subtitle": "Velas mensais (OHLC) com média móvel de 12 meses",
            "kind": "candle",
            "section": "market",
            "series": [
                {
                    "id": "ewz",
                    "label": "EWZ",
                    "color": "#2de2e6",
                    "axis": "left",
                    "decimals": 2,
                    "prefix": "US$ ",
                    "points": ewz_candles,
                }
            ],
        },
        {
            "id": "ibov-12m",
            "title": "IBOVESPA — VELAS",
            "subtitle": "Velas mensais (OHLC) com média móvel de 12 meses",
            "kind": "candle",
            "section": "market",
            "series": [
                {
                    "id": "ibov",
                    "label": "IBOVESPA",
                    "color": "#2de2e6",
                    "axis": "left",
                    "decimals": 0,
                    "suffix": " pts",
                    "points": ibov_candles,
                }
            ],
        },
        {
            "id": "btc-usd-12m",
            "title": "BTC/USD — VELAS",
            "subtitle": "Velas mensais (OHLC) com média móvel de 12 meses",
            "kind": "candle",
            "section": "market",
            "series": [
                {
                    "id": "btc-usd",
                    "label": "BTC/USD",
                    "color": "#f5c542",
                    "axis": "left",
                    "decimals": 0,
                    "prefix": "US$ ",
                    "points": btc_usd_candles,
                }
            ],
        },
        {
            "id": "btc-brl-12m",
            "title": "BTC/BRL — VELAS",
            "subtitle": "Velas mensais (OHLC) com média móvel de 12 meses",
            "kind": "candle",
            "section": "market",
            "series": [
                {
                    "id": "btc-brl",
                    "label": "BTC/BRL",
                    "color": "#f5c542",
                    "axis": "left",
                    "decimals": 0,
                    "prefix": "R$ ",
                    "points": btc_brl_candles,
                }
            ],
        },
        {
            "id": "flow-12m",
            "title": "FLUXO CAMBIAL — ACUMULADO 12M",
            "subtitle": "Soma móvel de 12 meses (US$ bi)",
            "kind": "bar",
            "section": "market",
            "series": [
                {
                    "id": "flow",
                    "label": "Fluxo financeiro 12m",
                    "color": "#2de2e6",
                    "axis": "left",
                    "decimals": 1,
                    "prefix": "US$ ",
                    "suffix": " bi",
                    "points": flow_rolling_chart,
                }
            ],
        },
        {
            "id": "debt-12m",
            "title": "DÍVIDA BRUTA / PIB — MÉDIA 12M",
            "subtitle": "Média móvel de 12 meses (% do PIB)",
            "kind": "line",
            "section": "fiscal",
            "series": [
                {
                    "id": "debt",
                    "label": "Dívida bruta (média 12m)",
                    "color": "#2de2e6",
                    "axis": "left",
                    "decimals": 2,
                    "suffix": "%",
                    "points": debt_rolling_chart,
                }
            ],
        },
        {
            "id": "revenue-12m",
            "title": "ARRECADAÇÃO FEDERAL — ACUMULADO 12M",
            "subtitle": "Soma móvel de 12 meses (R$ bi)",
            "kind": "line",
            "section": "fiscal",
            "series": [
                {
                    "id": "revenue",
                    "label": "Arrecadação 12m",
                    "color": "#2de2e6",
                    "axis": "left",
                    "decimals": 1,
                    "prefix": "R$ ",
                    "suffix": " bi",
                    "points": revenue_rolling,
                }
            ],
        },
        {
            "id": "interest-12m",
            "title": "JUROS DA DÍVIDA — ACUMULADO 12M",
            "subtitle": "Soma móvel de 12 meses (R$ trilhões)",
            "kind": "line",
            "section": "fiscal",
            "series": [
                {
                    "id": "interest",
                    "label": "Juros nominais 12m",
                    "color": "#2de2e6",
                    "axis": "left",
                    "decimals": 2,
                    "prefix": "R$ ",
                    "suffix": " tri",
                    "points": interest_rolling_tri,
                }
            ],
        },
        {
            "id": "primary-12m",
            "title": "RESULTADO PRIMÁRIO — ACUMULADO 12M",
            "subtitle": "Acumulado em 12 meses (% do PIB)",
            "kind": "bar",
            "section": "fiscal",
            "series": [
                {
                    "id": "primary",
                    "label": "Resultado primário 12m",
                    "color": "#2de2e6",
                    "axis": "left",
                    "decimals": 2,
                    "suffix": "% PIB",
                    "points": primary_chart_points,
                }
            ],
        },
        {
            "id": "gdp-growth",
            "title": "CRESCIMENTO DO PIB — ANUAL",
            "subtitle": "Variação real anual (%)",
            "kind": "bar",
            "section": "fiscal",
            "series": [
                {
                    "id": "gdp-growth",
                    "label": "Crescimento do PIB",
                    "color": "#2de2e6",
                    "axis": "left",
                    "decimals": 2,
                    "suffix": "%",
                    "points": gdp_growth_chart,
                }
            ],
        },
        {
            "id": "ipca-12m",
            "title": "IPCA — ACUMULADO 12M",
            "subtitle": "Inflação composta em 12 meses (%)",
            "kind": "bar",
            "section": "monetary",
            "series": [
                {
                    "id": "ipca",
                    "label": "IPCA 12m",
                    "color": "#2de2e6",
                    "axis": "left",
                    "decimals": 2,
                    "suffix": "%",
                    "points": ipca_rolling_chart,
                }
            ],
        },
        {
            "id": "money-12m",
            "title": "IMPRESSÃO DE DINHEIRO — MÉDIA 12M",
            "subtitle": "Base monetária restrita, média móvel (R$ bi)",
            "kind": "line",
            "section": "monetary",
            "series": [
                {
                    "id": "money",
                    "label": "Base monetária (média 12m)",
                    "color": "#2de2e6",
                    "axis": "left",
                    "decimals": 1,
                    "prefix": "R$ ",
                    "suffix": " bi",
                    "points": money_rolling,
                }
            ],
        },
        {
            "id": "real-rate-12m",
            "title": "SELIC x JURO REAL — MÉDIA 12M",
            "subtitle": "Média móvel de 12 meses (%)",
            "kind": "line",
            "section": "monetary",
            "series": [
                {
                    "id": "real-rate",
                    "label": "Juro real (média 12m)",
                    "color": "#ff4d5e",
                    "axis": "left",
                    "decimals": 2,
                    "suffix": "%",
                    "points": real_rolling,
                },
                {
                    "id": "selic",
                    "label": "Selic meta (média 12m)",
                    "color": "#2de2e6",
                    "axis": "left",
                    "decimals": 2,
                    "suffix": "%",
                    "points": selic_rolling,
                },
            ],
        },
        {
            "id": "pib-12m",
            "title": "PIB — ACUMULADO 12M",
            "subtitle": "Soma móvel de 12 meses (R$ trilhões)",
            "kind": "line",
            "section": "monetary",
            "series": [
                {
                    "id": "pib",
                    "label": "PIB 12m",
                    "color": "#2de2e6",
                    "axis": "left",
                    "decimals": 2,
                    "prefix": "R$ ",
                    "suffix": " tri",
                    "points": pib_rolling,
                }
            ],
        },
        {
            "id": "focus-ipca",
            "title": "EXPECTATIVA DE INFLAÇÃO — ANUAL",
            "subtitle": "Mediana Focus do IPCA por ano (%)",
            "kind": "line",
            "section": "future",
            "series": [
                {
                    "id": "focus-ipca",
                    "label": "IPCA esperado",
                    "color": "#2de2e6",
                    "axis": "left",
                    "decimals": 2,
                    "suffix": "%",
                    "points": focus_ipca,
                }
            ],
        },
        {
            "id": "focus-pib",
            "title": "EXPECTATIVA DE PIB — ANUAL",
            "subtitle": "Mediana Focus de crescimento por ano (%)",
            "kind": "line",
            "section": "future",
            "series": [
                {
                    "id": "focus-pib",
                    "label": "PIB esperado",
                    "color": "#2de2e6",
                    "axis": "left",
                    "decimals": 2,
                    "suffix": "%",
                    "points": focus_pib,
                }
            ],
        },
        {
            "id": "future-rates",
            "title": "JUROS FUTUROS — DI 2032 / 2035",
            "subtitle": "Taxa corrente dos contratos DI (% a.a.)",
            "kind": "line",
            "section": "future",
            "series": [
                {
                    "id": "future-rates",
                    "label": "DI futuro",
                    "color": "#2de2e6",
                    "axis": "left",
                    "decimals": 2,
                    "suffix": "%",
                    "points": future_rates,
                }
            ],
        },
    ]

    alerts = build_alerts(
        debt,
        real_rate,
        flow,
        ipca,
        revenue,
        money_points,
        ewz_points,
        ibov_points,
        focus_ipca,
    )

    snapshot = {
        "generatedAt": NOW.isoformat().replace("+00:00", "Z"),
        "metrics": metrics,
        "charts": charts,
        "alerts": alerts,
        "news": news_items(),
        "impostometro": impostometro_live,
    }

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(
        json.dumps(snapshot, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    print(f"Wrote {OUTPUT}")


if __name__ == "__main__":
    main()
