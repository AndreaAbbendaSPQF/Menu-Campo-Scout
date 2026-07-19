import { useSaveFeedbackVisibile } from "../context/SaveFeedbackContext";

export default function SaveIndicator() {
  const visibile = useSaveFeedbackVisibile();
  return <div className={"save-indicator" + (visibile ? " visibile" : "")}>Salvato ✓</div>;
}
