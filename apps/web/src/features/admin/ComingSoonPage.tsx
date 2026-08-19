import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function ComingSoonPage({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="flex h-full items-center justify-center">
      <Card className="max-w-md border-dashed text-center">
        <CardHeader>
          <Badge
            variant="outline"
            className="mx-auto w-fit bg-amber-500/10 uppercase tracking-wide text-amber-600"
          >
            Coming soon
          </Badge>
          <CardTitle>
            <h1>{title}</h1>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{description}</p>
        </CardContent>
      </Card>
    </div>
  );
}
