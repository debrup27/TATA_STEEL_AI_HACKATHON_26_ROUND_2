import { manasChatPath, parseManasChatSessionId } from "@/lib/manas-chat-path";

describe("manas-chat-path", () => {
  const uuid = "a1b2c3d4-e5f6-4789-a012-3456789abcde";

  it("builds base path for new chat", () => {
    expect(manasChatPath(null)).toBe("/manas/chat");
    expect(manasChatPath()).toBe("/manas/chat");
  });

  it("builds path with session id", () => {
    expect(manasChatPath(uuid)).toBe(`/manas/chat/${uuid}`);
  });

  it("parses session id from pathname", () => {
    expect(parseManasChatSessionId("/manas/chat")).toBeNull();
    expect(parseManasChatSessionId(`/manas/chat/${uuid}`)).toBe(uuid);
    expect(parseManasChatSessionId(`/manas/chat/${uuid}/`)).toBe(uuid);
  });
});
