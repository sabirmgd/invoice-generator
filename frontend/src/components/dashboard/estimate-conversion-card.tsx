'use client';

interface EstimateConversionCardProps {
  data: {
    totalNonDraft: number;
    converted: number;
    conversionRate: number;
  };
}

export function EstimateConversionCard({ data }: EstimateConversionCardProps) {
  return (
    <div className="rounded-xl border border-border bg-surface/50 p-5">
      <h3 className="text-sm font-semibold text-foreground">
        Estimate Conversion
      </h3>
      {data.totalNonDraft > 0 ? (
        <div className="mt-4">
          <p className="text-3xl font-bold text-foreground">
            {data.conversionRate}%
          </p>
          <p className="mt-1 text-xs text-text-secondary">
            {data.converted} of {data.totalNonDraft} estimates converted
          </p>
          <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-surface">
            <div
              className="h-full rounded-full bg-primary transition-all duration-500"
              style={{ width: `${Math.min(data.conversionRate, 100)}%` }}
            />
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
            <div className="flex items-center gap-2">
              <span className="inline-block h-2 w-2 rounded-full bg-primary" />
              <span className="text-text-secondary">Converted</span>
              <span className="ml-auto font-medium text-foreground">
                {data.converted}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-block h-2 w-2 rounded-full bg-surface" />
              <span className="text-text-secondary">Other</span>
              <span className="ml-auto font-medium text-foreground">
                {data.totalNonDraft - data.converted}
              </span>
            </div>
          </div>
        </div>
      ) : (
        <div className="mt-4 flex h-[120px] items-center justify-center">
          <p className="text-sm text-text-secondary">No estimates sent yet</p>
        </div>
      )}
    </div>
  );
}
