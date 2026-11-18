import { Select } from "../../shared/design-system/ui/Select";
import { COMPACT_AT, compactAt } from "./compact-at";

const OPTIONS = [
  { value: "", label: "Default" },
  ...COMPACT_AT.map((value) => ({
    value,
    label: `${Number(value) / 1000}K tokens`,
  })),
];

/** When the agent's session compacts its context: a size, or the harness's
 * own default. `description` says how the harness applies it. */
export function CompactionSelect({
  value,
  description,
  disabled = false,
  onChange,
}: {
  value: string | undefined;
  description: string;
  disabled?: boolean;
  onChange(value: string): void;
}) {
  return (
    <Select
      label="Auto-compact at"
      variant="preference"
      description={description}
      value={compactAt(value) ? (value ?? "") : ""}
      groups={[{ label: "", options: OPTIONS }]}
      disabled={disabled}
      onValueChange={onChange}
    />
  );
}
