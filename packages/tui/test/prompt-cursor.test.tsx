import { TextareaRenderable } from "@opentui/core"
import { expect, test } from "bun:test"
import { takeDraft } from "../src/component/prompt/draft-stash"
import { createAppFixture } from "./fixture/app"

test("keypad Home and End move the prompt caret", async () => {
  takeDraft(undefined)
  await using setup = await createAppFixture({ width: 100, height: 30 })
  await setup.ready
  await setup.waitForFrame(() => setup.renderer.currentFocusedEditor instanceof TextareaRenderable)
  const prompt = setup.renderer.currentFocusedEditor
  if (!(prompt instanceof TextareaRenderable)) throw new Error("expected the focused prompt textarea")
  await setup.mockInput.pasteBracketedText("alpha beta\ngamma delta")
  await setup.renderOnce()

  // Windows Terminal reports NumLock-off keypad Home/End as kitty CSI-u sequences.
  for (const input of [
    { sequence: "\x1b[57423u", start: 15, end: 11 },
    { sequence: "\x1b[57424u", start: 11, end: 22 },
    { sequence: "\x1b[57423u", start: 22, end: 11 },
  ]) {
    prompt.cursorOffset = input.start
    setup.renderer.stdin.emit("data", Buffer.from(input.sequence))
    await setup.renderOnce()
    expect(prompt.cursorOffset, input.sequence).toBe(input.end)
  }
})

test("the prompt keeps a cursor style set on its textarea when the theme changes", async () => {
  // Other app tests can leave a home draft in the process-wide stash.
  takeDraft(undefined)
  await using setup = await createAppFixture({
    config: { animations: false, keybinds: { "theme.switch_mode": "f6" } },
  })
  await setup.ready
  await setup.waitForFrame((frame) => frame.includes("commands"))
  const prompt = setup.renderer.currentFocusedEditor
  if (!(prompt instanceof TextareaRenderable)) throw new Error("expected the focused prompt textarea")
  const color = prompt.cursorColor

  // A plugin such as a modal editing mode restyles the prompt cursor directly.
  prompt.cursorStyle = { style: "line", blinking: false }
  setup.mockInput.pressKey("F6")
  await setup.renderOnce()
  await Bun.sleep(10)
  await setup.renderOnce()

  expect(prompt.cursorColor).not.toEqual(color)
  expect(prompt.cursorStyle).toMatchObject({ style: "line", blinking: false })
})
