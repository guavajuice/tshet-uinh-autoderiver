import Schema, { UserSchema } from "./Classes/Schema";
import { qieyunTextLabelURLPrefix } from "./consts";
import { evaluateOption, getArticle, setArticle } from "./options";
import { fetchFile, normalizeFileName, notifyError } from "./utils";

import type { Require } from "./Classes/Schema";
import type { MainState, ReactNode } from "./consts";

export default async function evaluate(state: MainState): Promise<ReactNode> {
  const { schemas, option } = state;

  if (option === "convertPresetArticle" && !getArticle())
    setArticle(await fetchFile(qieyunTextLabelURLPrefix + "index.txt"));
  else if (option === "compareSchemas" && schemas.length < 2) throw notifyError("此選項需要兩個或以上方案");
  else await new Promise(resolve => setTimeout(resolve));

  try {
    const inputs: [input: Schema, parameters: Record<string, unknown>, require: Require][] = schemas.map(
      ({ name, input, parameters }) => [new Schema(input), parameters.pack(), require(name)],
    );
    return evaluateOption[option](state, (音韻地位, 字頭) =>
      inputs.map(([input, parameters, require]) => input.derive(音韻地位, 字頭, parameters, require)),
    );
  } catch (err) {
    throw notifyError("程式碼錯誤", err);
  }

  function require(current: string, references: string[] = []): Require {
    const newReferences = references.concat(current);
    if (references.includes(current)) throw notifyError("Circular reference detected: " + newReferences.join(" -> "));
    return (音韻地位, 字頭) => sample => {
      const schema = schemas.find(({ name }) => name === normalizeFileName(sample) + ".js");
      if (!schema) throw notifyError("Schema not found");
      return new UserSchema(schema.input, require(sample, newReferences), 音韻地位, 字頭);
    };
  }
}