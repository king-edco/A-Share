import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useExamsQuery } from "./catalog";

/** Selector for the exam context used by the Series/Subjects/Chapters pages. */
export function ExamSelector({
  value,
  onChange,
  label,
}: {
  value: string | null;
  onChange: (examId: string | null) => void;
  label: string;
}) {
  const examsQuery = useExamsQuery();
  const exams = examsQuery.data ?? [];

  return (
    <div className="w-72">
      <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <Select
        value={value ?? ""}
        onValueChange={(v) => onChange(v || null)}
      >
        <SelectTrigger aria-label={label}>
          <SelectValue placeholder="Select an exam…" />
        </SelectTrigger>
        <SelectContent>
          {exams.map((exam) => (
            <SelectItem key={exam.id} value={exam.id}>
              {exam.code} — {exam.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
