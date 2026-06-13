import numpy as np
from dataclasses import dataclass, field
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta


@dataclass
class SensorSample:
    timestamp: datetime
    sensor_name: str
    value: float
    quality_flag: int = 0
    source: str = "synthetic"
    condition_type: str = ""
    label: Optional[Any] = None


@dataclass
class GeneratorOutput:
    asset_type: str
    samples: List[SensorSample] = field(default_factory=list)
    fault_events: List[Dict] = field(default_factory=list)
    labels: Dict[str, Any] = field(default_factory=dict)


class BaseGenerator:
    ASSET_TYPE: str = ""
    DEFAULT_NOISE_STD: float = 0.02

    def __init__(self, seed: int = 42):
        self.rng = np.random.default_rng(seed)

    def _noise(self, value: float, std_frac: float = None) -> float:
        std = (std_frac or self.DEFAULT_NOISE_STD) * abs(value) if value != 0 else 0.01
        return float(self.rng.normal(value, std))

    def generate(self, n_samples: int, start_time: datetime = None, **kwargs) -> GeneratorOutput:
        raise NotImplementedError

    def _timestamps(self, n: int, start: datetime, freq_sec: float = 5.0) -> List[datetime]:
        if start is None:
            start = datetime.utcnow()
        return [start + timedelta(seconds=i * freq_sec) for i in range(n)]
