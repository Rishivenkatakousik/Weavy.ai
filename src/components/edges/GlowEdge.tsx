"use client";

import React, { memo } from "react";
import {
  BaseEdge,
  getBezierPath,
  type EdgeProps,
} from "@xyflow/react";
import { useWorkflowStore } from "@/src/store/workflowStore";

const DEFAULT_STROKE = "#525252";
const DEFAULT_STROKE_WIDTH = 2;
const ACTIVE_STROKE = "#22d3ee";
const GLOW_STROKE = "#22d3ee";
const GLOW_WIDTH = 10;
const GLOW_OPACITY = 0.35;
const BEAM_COLOR = "#22d3ee";
const BEAM_R = 5;
const BEAM_DURATION = "1.5s";

function GlowEdgeComponent({
  id,
  source,
  target,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style,
  ...rest
}: EdgeProps) {
  const activeRunNodeStatuses = useWorkflowStore(
    (s) => s.activeRunNodeStatuses
  );
  const statuses = activeRunNodeStatuses ?? {};
  const targetRunning = statuses[target] === "RUNNING";
  const isActive = targetRunning;

  const [edgePath] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const resolvedStyle = style ?? {};
  const stroke = (resolvedStyle.stroke as string) ?? DEFAULT_STROKE;
  const strokeWidth =
    (resolvedStyle.strokeWidth as number) ?? DEFAULT_STROKE_WIDTH;

  if (!isActive) {
    return (
      <BaseEdge
        id={id}
        path={edgePath}
        style={{ stroke, strokeWidth, fill: "none", ...resolvedStyle }}
        {...rest}
      />
    );
  }

  return (
    <>
      {}
      <path
        d={edgePath}
        fill="none"
        stroke={GLOW_STROKE}
        strokeWidth={GLOW_WIDTH}
        strokeOpacity={GLOW_OPACITY}
        className="react-flow__edge-path"
      />
      {}
      <circle r={BEAM_R} fill={BEAM_COLOR} opacity={0.9}>
        <animateMotion
          dur={BEAM_DURATION}
          repeatCount="indefinite"
          path={edgePath}
        />
      </circle>
      {}
      <BaseEdge
        id={id}
        path={edgePath}
        style={{
          stroke: ACTIVE_STROKE,
          strokeWidth,
          fill: "none",
          ...resolvedStyle,
        }}
        {...rest}
      />
    </>
  );
}

const GlowEdge = memo(GlowEdgeComponent);
export default GlowEdge;
