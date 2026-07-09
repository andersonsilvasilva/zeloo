"use client";

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { WEEKDAY_KEYS, type WorkingHoursInput } from "@/modules/barbers/schemas/barber.schema";

const WEEKDAY_LABELS: Record<(typeof WEEKDAY_KEYS)[number], string> = {
  seg: "Segunda",
  ter: "Terça",
  qua: "Quarta",
  qui: "Quinta",
  sex: "Sexta",
  sab: "Sábado",
  dom: "Domingo",
};

export interface WorkingHoursEditorProps {
  value: WorkingHoursInput;
  onChange: (value: WorkingHoursInput) => void;
}

/** Cada dia aceita um ou mais intervalos "HH:MM-HH:MM" separados por vírgula. Vazio = folga. */
export function WorkingHoursEditor({ value, onChange }: WorkingHoursEditorProps) {
  function handleDayChange(day: (typeof WEEKDAY_KEYS)[number], raw: string) {
    const ranges = raw
      .split(",")
      .map((r) => r.trim())
      .filter(Boolean);
    onChange({ ...value, [day]: ranges });
  }

  return (
    <div className="space-y-2">
      <Label>Horário de trabalho</Label>
      <div className="space-y-2 rounded-lg border border-border p-3">
        {WEEKDAY_KEYS.map((day) => (
          <div key={day} className="grid grid-cols-[100px_1fr] items-center gap-2">
            <span className="text-sm text-text-secondary">{WEEKDAY_LABELS[day]}</span>
            <Input
              value={value[day]?.join(", ") ?? ""}
              onChange={(e) => handleDayChange(day, e.target.value)}
              placeholder="09:00-19:00 (folga se vazio)"
            />
          </div>
        ))}
      </div>
      <p className="text-xs text-text-secondary">
        Vários intervalos no mesmo dia: separe por vírgula, ex. "09:00-12:00, 13:00-18:00".
      </p>
    </div>
  );
}
