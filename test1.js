export default {
  async fetch(request, env) {
    if (request.method !== "POST") return new Response("LINE Bot is running!");

    try {
      const apiKey = "1209_Test_dummy_key_for_demo_only";
      //上面這行是我額外加的Token
      const body = await request.json();
      const event = body.events?.[0];
      if (!event) return new Response("OK");

      const replyToLine = async (replyToken, messages) => {
        await fetch("https://api.line.me/v2/bot/message/reply", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${env.CHANNEL_ACCESS_TOKEN}`,
          },
          body: JSON.stringify({ replyToken, messages }),
        });
      };

      // 只處理文字訊息
      if (event.type === "message" && event.message.type === "text") {
        const userMessage = event.message.text;

        try {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 8000);

          const openaiRes = await fetch("https://api.openai.com/v1/responses", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${env.OPENAI_API_KEY}`,
            },
            body: JSON.stringify({
              model: "gpt-5.1-chat-latest",
              input: [
                {
                  role: "system",
                  content: [{ type: "text", text: "你是一個友善的聊天助理。" }]
                },
                {
                  role: "user",
                  content: [{ type: "text", text: userMessage }]
                }
              ],
              max_output_tokens: 200
            }),
            signal: controller.signal
          });

          clearTimeout(timeout);

          const data = await openaiRes.json();
          const replyText =
            data.output_text || "GPT-5.1 沒有回覆訊息。";

          await replyToLine(event.replyToken, [
            { type: "text", text: replyText }
          ]);

        } catch (err) {
          console.error("OpenAI 錯誤或超時:", err);
          await replyToLine(event.replyToken, [
            { type: "text", text: "GPT-5.1 回覆失敗或超時，請稍後再試。" }
          ]);
        }

        return new Response("OK");
      }

      await replyToLine(event.replyToken, [
        { type: "text", text: "目前僅支援文字訊息喔！" }
      ]);
      return new Response("OK");

    } catch (err) {
      console.error("Worker 發生錯誤:", err);
      return new Response(`Worker 發生錯誤: ${err.message}`, { status: 500 });
    }

  }
};
