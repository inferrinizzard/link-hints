import { fireAndForget } from "../shared/main";
import BackgroundProgram from "./Program";

const program = new BackgroundProgram();

fireAndForget(program.start(), "main->BackgroundProgram#start");

if (typeof window !== "undefined") {
  // Attach the instance to the background page for debugging.
  // @ts-expect-error This is for debugging only, and should never be accessed in the code.
  window.program = program;
}
