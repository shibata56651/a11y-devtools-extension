document.getElementById("runCheck").addEventListener("click", () => {
  chrome.devtools.inspectedWindow.eval(
    `axe.run().then(results => console.log(results)).catch(err => console.error(err))`,
    function (result, isException) {
      if (isException) {
        console.error("エラー: ", isException);
      } else {
        document.getElementById("results").textContent = JSON.stringify(
          result,
          null,
          2
        );
      }
    }
  );
});
