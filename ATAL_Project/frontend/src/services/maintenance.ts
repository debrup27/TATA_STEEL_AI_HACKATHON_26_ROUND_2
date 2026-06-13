import type { MaintenanceLog } from "./types";

export function getMaintenanceLogs(): MaintenanceLog[] {
  return [
    {
      id: "MR-2024-441",
      code: "F1-EQ09-BR",
      date: "2024-11-15",
      asset: "F1-EQ09 Centrifugal Exhauster",
      module: "CokeOven-Agent",
      description:
        "Bearing replacement on centrifugal exhauster F1-EQ09 at Coke Oven By-Product Plant. Diagnosis revealed excessive radial vibration (6.42 mm/s) surpassing OEM threshold. Bearing housing disassembled, raceways found spalled due to fatigue from continuous 24/7 operation. Replaced with SKF 22320 series spherical roller bearing. Housing realigned to within 0.02mm tolerance. Post-replacement vibration dropped to 0.8 mm/s.",
      verdict: "Routine bearing fatigue failure due to continuous operation. Replacement successful. Vibration restored to nominal.",
      operator: "R. Sharma",
    },
    {
      id: "MR-2024-388",
      code: "F2-EQ04-SP",
      date: "2024-10-02",
      asset: "F2-EQ04 Drive Sprocket",
      module: "Sinter-Agent",
      description:
        "Sprocket tooth root cracking detected during routine strand speed check. Strand speed had dropped to 2.4 m/min (target 3.1). Visual inspection revealed fatigue cracks at the root of three consecutive teeth on the drive sprocket of Sinter Strand A. Running surface showed uneven wear pattern consistent with misalignment.",
      verdict: "Tooth root fatigue cracking from cyclical loading and chain misalignment. Sprocket replaced, alignment corrected. Strand speed restored to 3.1 m/min.",
      operator: "A. Verma",
    },
    {
      id: "MR-2024-301",
      code: "F2-EQ09-WI",
      date: "2024-08-19",
      asset: "F2-EQ09 Waste Gas Fan Impeller",
      module: "Sinter-Agent",
      description:
        "Scheduled inspection of waste gas fan impeller F2-EQ09. Moderate pitting observed on blade leading edges from erosive particulate in sinter waste gas stream. Structural integrity assessment confirmed reinforcement sufficient. Dynamic balancing within acceptable tolerance.",
      verdict: "Moderate erosive wear within expected parameters. No immediate action required. Continue regular monitoring cycle.",
      operator: "S. Patel",
    },
    {
      id: "MR-2024-257",
      code: "F1-EQ11-EP",
      date: "2024-07-05",
      asset: "F1-EQ11 Electrostatic Precipitator",
      module: "CokeOven-Agent",
      description:
        "Routine collector grid cleaning and electrode inspection for electrostatic precipitator F1-EQ11. Two rapping mechanisms showed reduced impact force. Adjusted rapping timing sequence to restore cleaning efficiency. Collector plates cleaned of accumulated dust cake.",
      verdict: "Preventive maintenance completed. All parameters restored to nominal. Rapping mechanism adjustment improved cleaning efficiency by 18%.",
      operator: "P. Kumar",
    },
    {
      id: "MR-2024-192",
      code: "F2-EQ02-BF",
      date: "2024-05-20",
      asset: "F2-EQ02 Sinter Belt Feeder",
      module: "Sinter-Agent",
      description:
        "Emergency maintenance on F2-EQ02 Sinter Belt Feeder. Belt tracking deviation exceeded critical threshold at 45mm offset. Gearbox output shaft bearing registered 98°C operating temperature. Lubrication flush performed, belt tension realigned, and bearing inspected for spalling.",
      verdict: "Belt alignment drift combined with inadequate lubrication caused elevated bearing temperature. Lubrication cycle intervals revised from 30 to 15 days. Alignment corrected.",
      operator: "M. Das",
    },
  ];
}

export function getMaintenanceLogById(id: string): MaintenanceLog | undefined {
  const logs = getMaintenanceLogs();
  return logs.find((l) => l.id === id);
}
