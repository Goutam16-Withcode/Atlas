"""
engine/graph_rag.py — Plant Entity GraphRAG & Hierarchical Asset Memory Engine.
Provides relational topological traversal of plant assets, component subassemblies,
sensor telemetry mappings, failure mode graphs, and cross-session incident memory.
"""

from typing import Dict, List, Any, Optional
import time
from logger import get_logger

logger = get_logger("engine.graph_rag")


class PlantGraphRAG:
    """
    Industrial Graph Knowledge Base & Incident Memory.
    Models plant topology as a directed multi-layer graph:
      Plant -> Area -> Equipment -> Subassembly/Component -> Sensors/Telemetry -> SOPs & Failure Modes.
    """

    def __init__(self):
        # Asset Topology Hierarchy
        self._assets: Dict[str, Dict[str, Any]] = {
            "hydraulic-press-1": {
                "name": "Heavy Stamping Hydraulic Press 1",
                "area": "Stamping & Forming Cell A",
                "components": [
                    {"id": "RV-102", "name": "Main Proportional Relief Valve", "type": "hydraulic_valve"},
                    {"id": "CYL-01", "name": "Primary 500-Ton Ram Cylinder", "type": "actuator"},
                    {"id": "PMP-HYD", "name": "Variable Displacement Axial Piston Pump", "type": "pump"},
                    {"id": "OIL-RSV", "name": "1200L Hydraulic Reservoir Tank", "type": "fluid_system"},
                ],
                "normal_operating_envelope": {
                    "pressure_psi": {"min": 2600, "max": 3000, "trip": 3200},
                    "oil_temp_c": {"min": 45, "max": 65, "trip": 75},
                    "cycle_rate_spm": {"nominal": 18, "max": 24},
                },
                "failure_modes": [
                    {
                        "symptom": "pressure spike / overpressure (>3000 PSI)",
                        "mechanism": "Proportional relief valve RV-102 spool sticking or contamination in pilot line",
                        "mitigation_sop": "SOP-HYD-004",
                        "severity": "high",
                    },
                    {
                        "symptom": "fluid weeping / cylinder drift / pressure drop",
                        "mechanism": "Nitrile chevron packing seal degradation on CYL-01 rod due to thermal cycling",
                        "mitigation_sop": "SOP-HYD-005",
                        "severity": "critical",
                    },
                ],
                "linked_sops": ["SOP-HYD-004", "SOP-HYD-005", "SOP-LOTO-001"],
            },
            "cooling-pump-2": {
                "name": "Auxiliary Closed-Loop Cooling Pump 2",
                "area": "Utilities & Thermal Plant",
                "components": [
                    {"id": "IMP-02", "name": "Closed Impeller Cast Bronze", "type": "impeller"},
                    {"id": "BRG-DE", "name": "Drive-End Deep Groove Ball Bearing", "type": "bearing"},
                    {"id": "SEAL-MECH", "name": "Cartridge Mechanical Face Seal", "type": "seal"},
                ],
                "normal_operating_envelope": {
                    "flow_rate_lpm": {"min": 40, "max": 60, "trip": 30},
                    "vibration_hz": {"nominal": 12, "warning": 18, "trip": 24},
                    "winding_temp_c": {"min": 30, "max": 75, "trip": 90},
                },
                "failure_modes": [
                    {
                        "symptom": "gravel-rattling sound / high-frequency vibration (>20 Hz)",
                        "mechanism": "Inlet net positive suction head (NPSH) deficit causing vapor bubble collapse (cavitation)",
                        "mitigation_sop": "SOP-PUMP-007",
                        "severity": "high",
                    },
                    {
                        "symptom": "flow rate collapse (<30 L/min)",
                        "mechanism": "Suction strainer blockage or pipe scale accumulation",
                        "mitigation_sop": "SOP-PMP-006",
                        "severity": "critical",
                    },
                ],
                "linked_sops": ["SOP-PUMP-007", "SOP-PMP-006", "SOP-LOTO-001"],
            },
            "conveyor-belt-3": {
                "name": "Main Assembly Line Conveyor Belt 3",
                "area": "Final Packaging & Assembly",
                "components": [
                    {"id": "MTR-DRV", "name": "15kW AC Induction Geared Motor", "type": "motor"},
                    {"id": "TEN-PUL", "name": "Pneumatic Take-Up Tensioner Pulley", "type": "tensioner"},
                    {"id": "BLT-EP", "name": "4-Ply EP400 Polyester Conveyor Belting", "type": "belt"},
                ],
                "normal_operating_envelope": {
                    "tension_psi": {"min": 80, "max": 90, "trip_low": 65},
                    "motor_temp_c": {"nominal": 65, "warning": 80, "trip": 90},
                    "speed_mpm": {"nominal": 25, "max": 35},
                },
                "failure_modes": [
                    {
                        "symptom": "motor thermal overload trip / high casing temp (>90°C)",
                        "mechanism": "Cooling fan cowl lint blockage combined with high belt drag from roller misalignment",
                        "mitigation_sop": "SOP-MTR-004",
                        "severity": "critical",
                    },
                    {
                        "symptom": "belt slippage / tracking wander",
                        "mechanism": "Tension take-up pressure dropped below 80 PSI or pulley lagging worn",
                        "mitigation_sop": "SOP-MTR-004",
                        "severity": "medium",
                    },
                ],
                "linked_sops": ["SOP-MTR-004", "SOP-LOTO-001"],
            },
        }

        # Persistent incident history graph (Equipment -> list of incidents)
        self._incident_log: Dict[str, List[Dict[str, Any]]] = {
            "hydraulic-press-1": [
                {
                    "timestamp": "2026-05-18 14:22:00",
                    "event": "Overpressure alarm triggered (3150 PSI)",
                    "root_cause": "Varnish buildup on RV-102 pilot spool causing slow response time",
                    "action_taken": "Replaced pilot valve cartridge; flushed hydraulic reservoir",
                }
            ],
            "cooling-pump-2": [
                {
                    "timestamp": "2026-06-12 09:15:00",
                    "event": "Vibration alarm 22 Hz",
                    "root_cause": "Cavitation due to partially closed manual suction isolation gate",
                    "action_taken": "Opened suction valve to 100% position; reset vibration sensor",
                }
            ],
        }

    def get_asset_subgraph(self, asset_id: str) -> Optional[Dict[str, Any]]:
        """Retrieve full topological graph for a given industrial unit."""
        key = asset_id.strip().lower()
        return self._assets.get(key)

    def diagnose_symptom(self, asset_id: str, symptom_text: str) -> List[Dict[str, Any]]:
        """Traverse the failure mode subgraph to determine likely physical mechanisms and SOPs."""
        asset = self.get_asset_subgraph(asset_id)
        if not asset:
            return []

        symptom_lower = symptom_text.lower()
        candidates = []
        for mode in asset.get("failure_modes", []):
            mode_symptom = mode["symptom"].lower()
            # Check overlap
            symptom_words = [w for w in symptom_lower.split() if len(w) > 3]
            match_score = sum(1 for w in symptom_words if w in mode_symptom)
            if match_score > 0 or any(kw in symptom_lower for kw in ["leak", "vibration", "pressure", "temp", "trip", "overheat"]):
                candidates.append({
                    "equipment": asset["name"],
                    "mechanism": mode["mechanism"],
                    "severity": mode["severity"],
                    "recommended_sop": mode["mitigation_sop"],
                    "match_confidence": 0.85 + (0.05 * min(match_score, 3)),
                })
        return candidates

    def get_incident_history(self, asset_id: str) -> List[Dict[str, Any]]:
        """Return historical failure log for cross-session diagnostic recall."""
        key = asset_id.strip().lower()
        return self._incident_log.get(key, [])

    def record_incident(self, asset_id: str, event: str, root_cause: str, action: str):
        """Append a newly diagnosed incident to the persistent graph."""
        key = asset_id.strip().lower()
        if key not in self._incident_log:
            self._incident_log[key] = []
        self._incident_log[key].append({
            "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
            "event": event,
            "root_cause": root_cause,
            "action_taken": action,
        })
        logger.info(f"Recorded incident in GraphRAG for '{asset_id}': {event}")


# Global singleton
plant_graph_rag = PlantGraphRAG()
