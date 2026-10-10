import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { unsupportedFacts } from "./editorial-gate.ts";

Deno.test("capitalised everyday verbs in the headline are not flagged", () => {
  const draft = "Police Assist Trader After Market Fire. According to the police, officers helped a trader recover goods after a fire swept through the market on Tuesday.";
  const source = "Officers helped a trader recover goods after a fire swept through the market on Tuesday, the police said.";
  assertEquals(unsupportedFacts(draft, source), []);
});

Deno.test("capitalised everyday verbs absent from the source wording are not flagged", () => {
  const draft = "Man Shoots Rival In Kumasi Bar Fight. According to police, a man opened fire on another man during an argument at a drinking spot in Kumasi on Friday night.";
  const source = "A man opened fire on another man during an argument at a drinking spot in Kumasi on Friday night, according to police.";
  assertEquals(unsupportedFacts(draft, source), []);
});

Deno.test("a genuine unsupported proper noun is still flagged", () => {
  const draft = "Two Arrested Over Kasoa Land Fraud. According to police, Kwame Mensimah was picked up over a disputed land sale in Kasoa on Monday.";
  const source = "Two people were picked up over a disputed land sale in Kasoa on Monday, according to police.";
  assertEquals(unsupportedFacts(draft, source), ["Kwame", "Mensimah"]);
});
