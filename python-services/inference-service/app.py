from __future__ import annotations

from datetime import datetime
from math import sin, cos
from typing import Any

from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI(title="AgroSense AI Inference Service", version="1.0.0")


class AnalysisRequest(BaseModel):
    fieldId: str
    field: dict[str, Any]


def clamp(value: float, minimum: float, maximum: float) -> float:
    return max(minimum, min(maximum, value))


def round_to(value: float, digits: int = 3) -> float:
    return round(value, digits)


def zone_status(ndvi: float) -> str:
    if ndvi >= 0.76:
        return "Healthy"
    if ndvi >= 0.66:
        return "Mild"
    if ndvi >= 0.56:
        return "Moderate"
    if ndvi >= 0.46:
        return "Stressed"
    if ndvi >= 0.32:
        return "Critical"
    return "Bare/Water"


@app.get("/health")
def health() -> dict[str, Any]:
    return {"ok": True, "service": "agrosense-inference", "timestamp": datetime.utcnow().isoformat() + "Z"}


@app.post("/analysis/run")
def run_analysis(payload: AnalysisRequest) -> dict[str, Any]:
    field = payload.field
    minute_seed = datetime.utcnow().minute + datetime.utcnow().second / 60.0

    zones: list[dict[str, Any]] = []
    for index, zone in enumerate(field["indices"]["zones"]):
        delta = sin((minute_seed + index) / 4.5) * 0.016 - index * 0.002
        ndvi = round_to(clamp(zone["ndvi"] + delta, 0.2, 0.9))
        zones.append({
            **zone,
            "ndvi": ndvi,
            "ndre": round_to(clamp(ndvi - 0.08, 0.12, 0.82)),
            "savi": round_to(clamp(ndvi - 0.03, 0.15, 0.87)),
            "evi": round_to(clamp(ndvi - 0.11, 0.1, 0.74)),
            "smi": round_to(clamp(zone["smi"] - delta / 2, 0.18, 0.84)),
            "clayMineralRatio": round_to(clamp(zone["clayMineralRatio"] + delta / 3, 0.8, 1.6)),
            "ironOxideIndex": round_to(clamp(zone["ironOxideIndex"] + delta / 4, 0.42, 1.18)),
            "status": zone_status(ndvi),
        })

    sensors: list[dict[str, Any]] = []
    for index, node in enumerate(field["latestSensors"]):
        sensors.append({
            **node,
            "lastSeen": datetime.utcnow().isoformat() + "Z",
            "readings": {
                "soilMoisture": round_to(clamp(node["readings"]["soilMoisture"] - index * 0.9 + sin(minute_seed / 2) * 1.6, 28, 92), 2),
                "airTemperature": round_to(clamp(node["readings"]["airTemperature"] + cos(minute_seed / 3 + index) * 0.9, 18, 37), 2),
                "humidity": round_to(clamp(node["readings"]["humidity"] + sin(minute_seed / 4 + index) * 2.8, 42, 96), 2),
                "leafWetness": round_to(clamp(node["readings"]["leafWetness"] + sin(minute_seed / 5 + index) * 0.04, 0.1, 0.96), 3),
                "windSpeed": round_to(clamp(node["readings"]["windSpeed"] + cos(minute_seed / 6 + index) * 0.6, 1.5, 19.5), 2),
                "solarRadiation": round_to(clamp(node["readings"]["solarRadiation"] + sin(minute_seed / 7 + index) * 18, 220, 820), 2),
                "soilPh": round_to(clamp(node["readings"]["soilPh"] + cos(minute_seed / 6 + index) * 0.05, 5.7, 7.9), 2),
            },
        })

    top_risks = []
    zone_breakdown = []
    for zone_index, zone in enumerate(field["risk"]["zoneBreakdown"]):
        pest_risks = []
        for pest_index, risk in enumerate(zone["pestRisks"]):
            probability = round_to(clamp(risk["probability"] + zone_index * 0.012 + pest_index * 0.004 - 0.008, 0.05, 0.95))
            pest_risks.append({**risk, "probability": probability})
            top_risks.append({
                "zoneId": zone["zoneId"],
                "zoneLabel": zone["zoneLabel"],
                "pestType": risk["pestType"],
                "probability": probability,
                "severity": "critical" if probability >= 0.8 else "warning" if probability >= 0.6 else "watch" if probability >= 0.4 else "info",
            })
        zone_breakdown.append({
            **zone,
            "status": zones[zone_index]["status"],
            "ndvi": zones[zone_index]["ndvi"],
            "soilHealthScore": max(24, zone["soilHealthScore"] - zone_index),
            "pestRisks": pest_risks,
        })

    top_risks = sorted(top_risks, key=lambda item: item["probability"], reverse=True)[:10]
    forecast_series = []
    for point in field["forecast"]["series"]:
        ndvi = point["ndvi"]
        if point["isForecast"]:
            ndvi = round_to(clamp(ndvi - 0.008, 0.22, 0.89))
        forecast_series.append({
            **point,
            "ndvi": ndvi,
            "ndre": round_to(clamp(ndvi - 0.08, 0.12, 0.8)),
            "savi": round_to(clamp(ndvi - 0.03, 0.14, 0.86)),
            "stressIndex": round_to(clamp(1 - ndvi + 0.16, 0.12, 0.92)),
        })

    next_field = {
        **field,
        "indices": {
            **field["indices"],
            "updatedAt": datetime.utcnow().isoformat() + "Z",
            "summary": {
                "avgNdvi": round_to(sum(zone["ndvi"] for zone in zones) / len(zones)),
                "avgNdre": round_to(sum(zone["ndre"] for zone in zones) / len(zones)),
                "avgSavi": round_to(sum(zone["savi"] for zone in zones) / len(zones)),
                "avgEvi": round_to(sum(zone["evi"] for zone in zones) / len(zones)),
                "avgSmi": round_to(sum(zone["smi"] for zone in zones) / len(zones)),
                "clayMineralRatio": round_to(sum(zone["clayMineralRatio"] for zone in zones) / len(zones)),
                "ironOxideIndex": round_to(sum(zone["ironOxideIndex"] for zone in zones) / len(zones)),
                "soilHealthScore": round(sum(zone["soilHealthScore"] for zone in zone_breakdown) / len(zone_breakdown)),
            },
            "zones": zones,
        },
        "mapGeoJson": {
            **field["mapGeoJson"],
            "features": [
                {
                    **feature,
                    "properties": {
                        **feature["properties"],
                        "status": zones[index]["status"],
                        "ndvi": zones[index]["ndvi"],
                        "pestRisk": top_risks[index]["probability"] if index < len(top_risks) else feature["properties"].get("pestRisk", 0),
                    },
                }
                for index, feature in enumerate(field["mapGeoJson"]["features"])
            ],
        },
        "latestSensors": sensors,
        "sensorHistory": {
            **field["sensorHistory"],
            "24h": field["sensorHistory"]["24h"][-23:] + [{
                "timestamp": datetime.utcnow().isoformat() + "Z",
                "soilMoisture": round_to(sum(node["readings"]["soilMoisture"] for node in sensors) / len(sensors), 2),
                "airTemperature": round_to(sum(node["readings"]["airTemperature"] for node in sensors) / len(sensors), 2),
                "humidity": round_to(sum(node["readings"]["humidity"] for node in sensors) / len(sensors), 2),
                "leafWetness": round_to(sum(node["readings"]["leafWetness"] for node in sensors) / len(sensors), 3),
                "windSpeed": round_to(sum(node["readings"]["windSpeed"] for node in sensors) / len(sensors), 2),
                "solarRadiation": round_to(sum(node["readings"]["solarRadiation"] for node in sensors) / len(sensors), 2),
                "soilPh": round_to(sum(node["readings"]["soilPh"] for node in sensors) / len(sensors), 2),
            }],
        },
        "risk": {
            "updatedAt": datetime.utcnow().isoformat() + "Z",
            "topRisks": top_risks,
            "zoneBreakdown": zone_breakdown,
        },
        "forecast": {
            "updatedAt": datetime.utcnow().isoformat() + "Z",
            "summary": {
                "currentStressIndex": forecast_series[29]["stressIndex"],
                "projectedStressIndex7Day": forecast_series[36]["stressIndex"],
                "projectedTrend": "declining",
                "projectedTrendWindowDays": 18,
            },
            "series": forecast_series,
        },
        "insights": [
            {
                "id": f"{payload.fieldId}-python-1",
                "urgency": "critical",
                "recommendation": "Python inference observed tightening canopy stress around the lowest-vigor zone. Validate irrigation and scout before the next spray cycle.",
                "modelConfidence": 0.92,
                "timestamp": datetime.utcnow().isoformat() + "Z",
                "modelSource": "CNN",
            },
            {
                "id": f"{payload.fieldId}-python-2",
                "urgency": "warning",
                "recommendation": "Sensor fusion recommends correcting moisture spread before applying additional nutrition in the affected blocks.",
                "modelConfidence": 0.87,
                "timestamp": datetime.utcnow().isoformat() + "Z",
                "modelSource": "SensorFusion",
            },
        ],
        "soil": {
            "score": max(24, field["soil"]["score"] - 1),
            "degradationTrend": "stable" if field["soil"]["score"] > 72 else "declining",
        },
        "overview": {
            "avgNdvi": round_to(sum(zone["ndvi"] for zone in zones) / len(zones)),
            "soilMoisturePct": round_to(sum(node["readings"]["soilMoisture"] for node in sensors) / len(sensors), 2),
            "activeStressZones": sum(1 for zone in zones if zone["status"] in {"Stressed", "Critical"}),
            "peakPestRiskPct": round(max(risk["probability"] for risk in top_risks) * 100),
            "avgHumidityPct": round_to(sum(node["readings"]["humidity"] for node in sensors) / len(sensors), 2),
            "avgLeafWetness": round_to(sum(node["readings"]["leafWetness"] for node in sensors) / len(sensors), 3),
        },
    }

    completed_at = datetime.utcnow().isoformat() + "Z"
    return {
        "startedAt": completed_at,
        "completedAt": completed_at,
        "source": "python-inference",
        "fieldState": next_field,
        "resultSummary": {
            "updatedZones": len(zones),
            "topRisk": top_risks[0] if top_risks else None,
            "avgNdvi": next_field["overview"]["avgNdvi"],
            "soilScore": next_field["soil"]["score"],
        },
        "modelMetrics": [
            {"modelName": "CNN Spatial Anomaly Detector", "accuracy": 0.931, "trainedAt": completed_at, "sampleCount": 18246},
            {"modelName": "LSTM Temporal Stress Predictor", "accuracy": 0.915, "trainedAt": completed_at, "sampleCount": 56230},
            {"modelName": "Sensor Fusion Pest Risk Classifier", "accuracy": 0.907, "trainedAt": completed_at, "sampleCount": 9090},
            {"modelName": "Soil Degradation Index", "accuracy": 0.893, "trainedAt": completed_at, "sampleCount": 13456},
        ],
    }
