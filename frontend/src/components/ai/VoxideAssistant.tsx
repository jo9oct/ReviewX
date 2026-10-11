// STATUS: CREATED

import { VoxideWidget } from "@voxide/react";
import { voxide, isVoxideConfigured } from "../../services/voxide";

export default function VoxideAssistant() {
  if (!isVoxideConfigured || !voxide) {
    return null;
  }

  return <VoxideWidget client={voxide} />;
}