"use client";

import * as React from "react";
import * as RechartsPrimitive from "recharts";
import { cn } from "../../lib/utils";

// Format: { THEME_NAME: CSS_SELECTOR }
type ChartTheme = Record<keyof typeof THEMES, string>;
const THEMES = { light: "", dark: ".dark" } as const;

export type ChartConfig = Record<
  string,
  {
    label?: React.ReactNode;
    icon?: React.ComponentType;
    color?: string;
    theme?: ChartTheme;
  }
>;

type ChartContextProps = {
  config: ChartConfig;
};

const ChartContext = React.createContext<ChartContextProps | null>(null);

function useChart() {
  const context = React.useContext(ChartContext);
  if (!context)
    throw new Error("useChart must be used within a ChartContainer");
  return context;
}

const ChartContainer = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div"> & {
    config: ChartConfig;
    children: React.ComponentProps<
      typeof RechartsPrimitive.ResponsiveContainer
    >["children"];
  }
>(({ id, className, children, config, ...props }, ref) => {
  const chartId = React.useMemo(
    () => `chart-${id || React.useId().replace(/:/g, "")}`,
    [id]
  );

  return (
    <ChartContext.Provider value={{ config }}>
      <div
        data-chart={chartId}
        ref={ref}
        className={cn(
          "flex aspect-video justify-center text-xs [&_.recharts-cartesian-axis-tick_text]:fill-muted-foreground [&_.recharts-cartesian-grid_line[stroke='#ccc']]:stroke-border/50 [&_.recharts-curve.recharts-tooltip-cursor]:stroke-border [&_.recharts-dot[stroke='#fff']]:stroke-transparent [&_.recharts-layer]:outline-none [&_.recharts-polar-grid_[stroke='#ccc']]:stroke-border [&_.recharts-radial-bar-background-sector]:fill-muted [&_.recharts-rectangle.recharts-tooltip-cursor]:fill-muted [&_.recharts-reference-line_[stroke='#ccc']]:stroke-border [&_.recharts-sector[stroke='#fff']]:stroke-transparent [&_.recharts-sector]:outline-none [&_.recharts-surface]:outline-none",
          className
        )}
        {...props}
      >
        <ChartStyle id={chartId} config={config} />
        <RechartsPrimitive.ResponsiveContainer>
          {children}
        </RechartsPrimitive.ResponsiveContainer>
      </div>
    </ChartContext.Provider>
  );
});
ChartContainer.displayName = "ChartContainer";

const ChartStyle = ({ id, config }: { id: string; config: ChartConfig }) => {
  const cssVars = React.useMemo(() => {
    return Object.entries(config)
      .filter(([_, { color, theme }]) => color || theme)
      .map(([key, { color, theme }]) => ({
        key,
        light: color ?? theme?.light,
        dark: color ?? theme?.dark,
      }));
  }, [config]);

  if (!cssVars.length) return null;

  const lightThemeVars = cssVars
    .map(({ key, light }) => light && `--color-${key}: ${light};`)
    .filter(Boolean)
    .join("\n");

  const darkThemeVars = cssVars
    .map(({ key, dark }) => dark && `--color-${key}: ${dark};`)
    .filter(Boolean)
    .join("\n");

  return (
    <style>
      {`
        ${THEMES.light}[data-chart="${id}"] { 
          ${lightThemeVars}
        }
        ${THEMES.dark}[data-chart="${id}"] { 
          ${darkThemeVars}
        }
      `}
    </style>
  );
};

// Improved type for Recharts payload
interface RechartsPayload {
  dataKey?: string | number;
  name?: string;
  value?: number | string;
  payload?: Record<string, unknown>;
  color?: string;
}

// Proper typing for tooltip props
interface ChartTooltipContentProps {
  active?: boolean;
  payload?: RechartsPayload[];
  label?: string | number;
  className?: string;
  indicator?: "line" | "dot" | "dashed";
  hideLabel?: boolean;
  hideIndicator?: boolean;
  nameKey?: string;
  labelKey?: string;
  labelFormatter?: (label: any, payload: RechartsPayload[]) => React.ReactNode;
  labelClassName?: string;
  formatter?: (
    value: any,
    name: string,
    props: RechartsPayload,
    index: number,
    payload?: any
  ) => React.ReactNode;
  color?: string;
}

const ChartTooltip = RechartsPrimitive.Tooltip;

const ChartTooltipContent = React.forwardRef<
  HTMLDivElement,
  ChartTooltipContentProps
>(
  (
    {
      active,
      payload = [],
      className,
      indicator = "dot",
      hideLabel = false,
      hideIndicator = false,
      label,
      labelFormatter,
      labelClassName,
      formatter,
      color,
      nameKey,
      labelKey,
    },
    ref
  ) => {
    const { config } = useChart();

    if (!active || !payload?.length) return null;

    const firstItem = payload[0];
    const nestLabel = payload.length === 1 && indicator !== "dot";

    const tooltipLabel = React.useMemo(() => {
      if (hideLabel) return null;

      const itemConfig = firstItem
        ? getConfigValue(config, firstItem, labelKey || "")
        : null;

      const rawLabel =
        labelKey && firstItem?.payload
          ? (firstItem.payload as any)[labelKey]
          : label;

      const displayLabel = itemConfig?.label || rawLabel;

      if (labelFormatter && displayLabel !== undefined) {
        return labelFormatter(displayLabel, payload);
      }

      return displayLabel !== undefined ? (
        <div className={cn("font-medium", labelClassName)}>
          {String(displayLabel)}
        </div>
      ) : null;
    }, [
      hideLabel,
      label,
      labelFormatter,
      payload,
      labelClassName,
      config,
      labelKey,
      firstItem,
    ]);

    return (
      <div
        ref={ref}
        className={cn(
          "grid min-w-[8rem] items-start gap-1.5 rounded-lg border border-border/50 bg-background px-2.5 py-1.5 text-xs shadow-xl",
          className
        )}
      >
        {!nestLabel && tooltipLabel}
        <div className="grid gap-1.5">
          {payload.map((item, index) => {
            const itemConfig = getConfigValue(config, item, nameKey || "");
            const indicatorColor =
              color || item.color || (item.payload as any)?.fill;

            const displayValue = React.useMemo(() => {
              if (typeof item.value === "number") {
                return item.value.toLocaleString();
              }
              return item.value ? String(item.value) : "";
            }, [item.value]);

            const key = `${item.dataKey || item.name || "item"}-${index}`;

            return (
              <div
                key={key}
                className={cn(
                  "flex w-full flex-wrap items-stretch gap-2 [&>svg]:h-2.5 [&>svg]:w-2.5 [&>svg]:text-muted-foreground",
                  indicator === "dot" && "items-center"
                )}
              >
                {formatter ? (
                  formatter(
                    item.value,
                    item.name || "",
                    item,
                    index,
                    item.payload
                  )
                ) : (
                  <>
                    {!hideIndicator &&
                      (itemConfig?.icon ? (
                        <itemConfig.icon />
                      ) : (
                        <div
                          className={cn(
                            "shrink-0 rounded-[2px] border-[--color-border] bg-[--color-bg]",
                            {
                              "h-2.5 w-2.5": indicator === "dot",
                              "w-1": indicator === "line",
                              "w-0 border-[1.5px] border-dashed bg-transparent":
                                indicator === "dashed",
                              "my-0.5": nestLabel && indicator === "dashed",
                            }
                          )}
                          style={
                            {
                              "--color-bg": indicatorColor,
                              "--color-border": indicatorColor,
                            } as React.CSSProperties
                          }
                        />
                      ))}
                    <div
                      className={cn(
                        "flex flex-1 justify-between leading-none",
                        nestLabel ? "items-end" : "items-center"
                      )}
                    >
                      <div className="grid gap-1.5">
                        {nestLabel && tooltipLabel}
                        <span className="text-muted-foreground">
                          {itemConfig?.label || item.name}
                        </span>
                      </div>
                      {displayValue && (
                        <span className="font-mono font-medium tabular-nums text-foreground">
                          {displayValue}
                        </span>
                      )}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }
);
ChartTooltipContent.displayName = "ChartTooltipContent";

const ChartLegend = RechartsPrimitive.Legend;

interface ChartLegendContentProps extends React.ComponentProps<"div"> {
  payload?: RechartsPayload[];
  verticalAlign?: "top" | "bottom";
  hideIcon?: boolean;
  nameKey?: string;
}

const ChartLegendContent = React.forwardRef<
  HTMLDivElement,
  ChartLegendContentProps
>(
  (
    { className, hideIcon = false, payload, verticalAlign = "bottom", nameKey },
    ref
  ) => {
    const { config } = useChart();

    if (!payload?.length) return null;

    return (
      <div
        ref={ref}
        className={cn(
          "flex items-center justify-center gap-4",
          verticalAlign === "top" ? "pb-3" : "pt-3",
          className
        )}
      >
        {payload.map((item, index) => {
          const itemConfig = getConfigValue(config, item, nameKey || "");
          const key = `${item.dataKey || item.value || "legend"}-${index}`;

          return (
            <div
              key={key}
              className="flex items-center gap-1.5 [&>svg]:h-3 [&>svg]:w-3 [&>svg]:text-muted-foreground"
            >
              {itemConfig?.icon && !hideIcon ? (
                <itemConfig.icon />
              ) : (
                !hideIcon && (
                  <div
                    className="h-2 w-2 shrink-0 rounded-[2px]"
                    style={{ backgroundColor: item.color }}
                  />
                )
              )}
              <span>{itemConfig?.label || item.value}</span>
            </div>
          );
        })}
      </div>
    );
  }
);
ChartLegendContent.displayName = "ChartLegendContent";

// Helper to extract item config from a payload
function getConfigValue(
  config: ChartConfig,
  payload: RechartsPayload,
  key: string
): ChartConfig[string] | undefined {
  const configKey = [
    payload.payload?.[key],
    payload.name,
    payload.dataKey,
    key,
  ].find((k) => typeof k === "string" && k in config) as string | undefined;

  return configKey ? config[configKey] : undefined;
}

export {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  ChartStyle,
  useChart,
};
