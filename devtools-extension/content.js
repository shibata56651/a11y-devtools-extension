document.addEventListener("DOMContentLoaded", () => {
  // パネル内のボタンを取得
  const runCheckButton = document.getElementById("runCheck");
  const resultsElement = document.getElementById("results");

  if (!runCheckButton || !resultsElement) {
    console.error("必要な要素が見つかりません: runCheck または results");
    return;
  }

  // 翻訳関数（MyMemory Translation API使用）
  async function translateText(text) {
    try {
      const response = await fetch(
        `https://api.mymemory.translated.net/get?q=${encodeURIComponent(
          text
        )}&langpair=en|ja`
      );
      const data = await response.json();
      return data.responseData.translatedText || text;
    } catch (error) {
      console.error("翻訳エラー:", error);
      return text; // 翻訳失敗時は元のテキストを返す
    }
  }

  // 複数のテキストを翻訳（レート制限を考慮して遅延を入れる）
  async function translateMultiple(texts) {
    const translations = {};
    for (const text of texts) {
      if (!translations[text]) {
        translations[text] = await translateText(text);
        // レート制限回避のため少し待機
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }
    return translations;
  }

  // ボタンのクリックイベントを設定
  runCheckButton.addEventListener("click", async () => {
    try {
      console.log("アクセシビリティ検査を開始します...");

      // axe.run を対象ページで実行
      const scriptSrc = chrome.runtime.getURL("axe.min.js");

      const result = await new Promise((resolve, reject) => {
        chrome.scripting.executeScript(
          {
            target: { tabId: chrome.devtools.inspectedWindow.tabId },
            world: "MAIN",
            func: (src) => {
              return new Promise((innerResolve, innerReject) => {
                console.log("スクリプトが注入されました:", src);

                const script = document.createElement("script");
                script.src = src;

                script.onload = () => {
                  if (!window.axe || typeof window.axe.run !== "function") {
                    console.error("axe-core の run メソッドが利用できません");
                    innerReject("axe-core の run メソッドが利用できません");
                    return;
                  }

                  window.axe
                    .run()
                    .then((results) => {
                      console.log("検査結果:", results);
                      innerResolve({ success: true, results });
                    })
                    .catch((err) => {
                      console.error("axe-core 実行中にエラーが発生:", err);
                      innerReject({ success: false, error: err.message });
                    });
                };

                script.onerror = () => {
                  console.error(
                    "axe-core の読み込みに失敗しました:",
                    script.src
                  );
                  innerReject("axe-core の読み込みに失敗しました");
                };

                document.head.appendChild(script);
              });
            },
            args: [scriptSrc],
          },
          (injectionResults) => {
            if (chrome.runtime.lastError) {
              console.error(
                "スクリプト実行エラー:",
                chrome.runtime.lastError.message
              );
              reject(chrome.runtime.lastError.message);
            } else if (
              injectionResults?.length > 0 &&
              injectionResults[0].result
            ) {
              resolve(injectionResults[0].result);
            } else {
              reject("スクリプトの実行結果がありません");
            }
          }
        );
      });

      console.log("検査結果:", result);

      if (result.success) {
        const violations = result.results.violations;

        // 翻訳が必要なテキストを収集
        const textsToTranslate = new Set();
        violations.forEach((violation) => {
          textsToTranslate.add(violation.help);
          textsToTranslate.add(violation.description);
          violation.nodes.forEach((node) => {
            if (node.failureSummary) {
              textsToTranslate.add(node.failureSummary);
            }
          });
        });

        // 翻訳を実行
        console.log("翻訳を開始します...");
        resultsElement.innerText = "エラーメッセージを日本語に翻訳中...";
        const translations = await translateMultiple([...textsToTranslate]);
        console.log("翻訳完了:", translations);

        // 違反箇所をハイライト
        violations.forEach((violation, index) => {
          chrome.scripting.executeScript({
            target: { tabId: chrome.devtools.inspectedWindow.tabId },
            func: (
              selector,
              failureSummaries,
              violationHelp,
              violationHelpUrl,
              index,
              translations
            ) => {
              document
                .querySelectorAll(selector)
                .forEach((element, nodeIndex) => {
                  element.style.outline = "3px solid red";
                  element.style.position
                    ? element.style.position
                    : (element.style.position = "relative"); // 親要素に相対位置を指定
                  element.classList.add(
                    "scroll-target-" + (index + 1) + "-" + (nodeIndex + 1)
                  );

                  const tooltip = document.createElement("div");
                  tooltip.style.position = "absolute";
                  tooltip.style.background = "rgba(255, 255, 255, 0.9)";
                  tooltip.style.border = "1px solid #000";
                  tooltip.style.borderRadius = "4px";
                  tooltip.style.padding = "8px";
                  tooltip.style.color = "#000";
                  tooltip.style.fontSize = "12px";
                  tooltip.style.whiteSpace = "pre-wrap";
                  tooltip.style.zIndex = "1000";
                  tooltip.style.top = "100%";
                  tooltip.style.left = "0";
                  tooltip.style.marginTop = "4px";
                  tooltip.style.boxShadow = "0 4px 6px rgba(0, 0, 0, 0.1)";
                  tooltip.style.width = "300px";

                  // 翻訳されたメッセージを使用
                  const originalFailureSummary = failureSummaries[nodeIndex] || "エラーの詳細情報なし";
                  const translatedHelp = translations[violationHelp] || violationHelp;
                  const translatedFailureSummary = translations[originalFailureSummary] || originalFailureSummary;

                  tooltip.innerText = `エラー内容: ${translatedHelp}\n\n詳細: ${translatedFailureSummary}\n\n参考: ${violationHelpUrl}`;

                  element.appendChild(tooltip);

                  tooltip.style.display = "none";
                  element.addEventListener("mouseenter", () => {
                    tooltip.style.display = "block";
                  });
                  element.addEventListener("mouseleave", () => {
                    tooltip.style.display = "none";
                  });
                });
            },
            args: [
              violation.nodes.map((node) => node.target.join(", ")).join(", "),
              violation.nodes.map((node) => node.failureSummary), // failureSummary のリスト
              violation.help, // ヘルプメッセージ
              violation.helpUrl, // 参考URL
              index,
              translations, // 翻訳データ
            ],
          });
        });

        // 検査結果をパネルに表示
        if (violations.length === 0) {
          resultsElement.innerText = "検査結果: 問題は検出されませんでした。";
        } else {
          const explanationList = violations.map((violation, index) => {
            // 違反の概要（翻訳済み）
            const translatedDescription = translations[violation.description] || violation.description;
            const translatedHelp = translations[violation.help] || violation.help;

            const summary = `違反： ${index + 1}: ${violation.id}`;
            const details = `詳細： ${translatedDescription}`;
            const help = `説明： ${translatedHelp}`;
            const helpUrl = `参考文献： ${violation.helpUrl}`;

            // 違反箇所のリスト
            const nodeDetails = violation.nodes
              .map((node, nodeIndex) => {
                const selectors = node.target.join(", ");
                const originalFailureSummary = node.failureSummary || "理由の説明はありません";
                const translatedFailureSummary = translations[originalFailureSummary] || originalFailureSummary;

                // クリック可能なリンクを作成
                return `
                  <span style="margin: 18px 0 0; padding: 0; text-align: left; display: inline-block; color: blue; text-decoration: none; word-wrap: break-word; word-break: break-word; overflow-wrap: anywhere; white-space: normal;"><a href="#"
                    class="scroll-to-element"
                    data-selector="scroll-target-${index + 1}-${
                  nodeIndex + 1
                }">対象 ${nodeIndex + 1}: ${selectors}</a>
                </span>
                <span style="display: inline-block; margin: 6px 0 0; padding: 0; word-wrap: break-word; word-break: break-word; overflow-wrap: anywhere; white-space: normal;">${translatedFailureSummary}</span>
                `;
              })
              .join("\n");

            // 各違反の説明を HTML として整形
            return `<div style="padding: 8px; border: 1px solid #ccc; margin-bottom: 8px; overflow: hidden; display: flex; flex-direction: column; gap: 4px;">
              <span style="word-wrap: break-word; word-break: break-word; overflow-wrap: anywhere; white-space: normal;">
                <strong>${details}</strong>
              </span>
              <span style="word-wrap: break-word; word-break: break-word; overflow-wrap: anywhere; white-space: normal;">
                <strong>${summary}</strong>
              </span>
              <span style="word-wrap: break-word; word-break: break-word; overflow-wrap: anywhere; white-space: normal;">
                ${help}
              </span>
              <span style="word-wrap: break-word; word-break: break-word; overflow-wrap: anywhere; white-space: normal;">
                ${helpUrl}
              </span>
              <div style="display: flex; flex-direction: column; gap: 4px;">
                ${nodeDetails}
              </div>
            </div>`;
          });

          // 日本語説明を結果に表示
          // resultsElement.innerText = `検査結果:\n${explanationList.join(
          //   "\n\n"
          // )}`;
          resultsElement.innerHTML = explanationList.join("\n\n");
        }

        document.querySelectorAll(".scroll-to-element").forEach((link) => {
          link.addEventListener("click", (event) => {
            event.preventDefault();

            const selector = event.target.dataset.selector;

            // ページ内にスクロールするリクエストを送信
            chrome.scripting.executeScript({
              target: { tabId: chrome.devtools.inspectedWindow.tabId },
              func: (selector) => {
                const element = document.querySelector(`.${selector}`);
                if (element) {
                  element.scrollIntoView({
                    behavior: "smooth",
                    block: "center",
                  });
                  element.style.outline = "3px solid blue"; // 強調表示
                  setTimeout(() => {
                    element.style.outline = "3px solid red"; // 強調解除
                  }, 2000);
                } else {
                  console.error("指定された要素が見つかりません:", selector);
                }
              },
              args: [selector],
            });
          });
        });
      } else {
        console.error("検査エラー:", result.error);
      }
    } catch (error) {
      console.log("キャッチしたエラー:", error);

      let errorDetails = "不明なエラーが発生しました";

      if (error instanceof Error) {
        errorDetails = `${error.name}: ${error.message}`;
        console.error("エラースタック:", error.stack);
      } else if (typeof error === "object" && error !== null) {
        errorDetails = JSON.stringify(error, null, 2);
      } else if (typeof error === "string") {
        errorDetails = error;
      }

      // エラーをパネルに表示
      resultsElement.innerText = `エラー詳細: ${errorDetails}`;
    }
  });
});
