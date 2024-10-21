// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = require('vscode');

const { GoogleGenerativeAI } = require("@google/generative-ai");

let GEMINI_API_KEY = "AIzaSyDwibbdX4F4xE3wk9cn_kQWeNS-rGvMa6w";
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed

/*
* @param {vscode.ExtensionContext} context
*/

var suggestions = [];
function activate(context) {
    /*
    // CompletionItemProviderの登録
    const provider = vscode.languages.registerCompletionItemProvider(
        { scheme: 'file', language: '*' },
        {
            provideCompletionItems(document, position) {
                return suggestions.map(suggestion => {
                    const item = new vscode.CompletionItem(suggestion.newName, vscode.CompletionItemKind.Variable);
                    item.insertText = suggestion.newName;
                    item.detail = `Suggested by Gemini API for ${suggestion.oldName}`;
                    item.command = {
                        command: 'editor.action.insertSnippet',
                        arguments: [{ snippet: suggestion.newName }],
                        title: `Replace ${suggestion.oldName} with ${suggestion.newName}`
                    };
                    return item;
                });
            }
        },
        '\t' // Tabキーで提案を受け入れる
    );

    context.subscriptions.push(provider);

    // Hover Providerの設定
    const hoverProvider = vscode.languages.registerHoverProvider({ scheme: 'file', language: '*' }, {
        provideHover(document, position) {
            const wordRange = document.getWordRangeAtPosition(position);
            const word = document.getText(wordRange);

            // 提案をフィルタリング
            const relevantSuggestions = suggestions.filter(suggestion => suggestion.oldName === word);

            if (relevantSuggestions.length > 0) {
                const markdownString = new vscode.MarkdownString(`**Suggested names:**\n`);
                relevantSuggestions.forEach(suggestion => {
                markdownString.appendMarkdown(`- [${suggestion.newName}](command:replaceVariable?${suggestion.oldName},${suggestion.newName})\n`);
            });
                return new vscode.Hover(markdownString);
            }
        }
    });

    context.subscriptions.push(hoverProvider);

    // 置き換えのコマンドを登録
    const replaceCommand = vscode.commands.registerCommand('replaceVariable', async (oldName, newName) => {
        console.log(`Replacing ${oldName} with ${newName}`); // ログを追加
        const editor = vscode.window.activeTextEditor;
        if (editor) {
            const document = editor.document;
            const text = document.getText();
            const newText = text.replace(new RegExp(`\\b${oldName}\\b`, 'g'), newName); // 変数名を置き換え
            const edit = new vscode.WorkspaceEdit();
            edit.replace(document.uri, new vscode.Range(0, 0, document.lineCount, 0), newText);
            await vscode.workspace.applyEdit(edit); // 変更を適用
            await document.save(); // 変更を保存
        }
    });

    context.subscriptions.push(replaceCommand);

    */
    // コマンドの登録
    let disposable = vscode.commands.registerCommand('extension.showOptions', () => {
        const panel = vscode.window.createWebviewPanel(
            'optionsPanel',
            '選択肢',
            vscode.ViewColumn.One,
            {}
        );

        // Webviewのコンテンツを設定
        panel.webview.html = getWebviewContent();

        // Webviewからのメッセージを受信
        panel.webview.onDidReceiveMessage(
            message => {
                switch (message.command) {
                    case 'selectOption':
                        vscode.window.showInformationMessage(`選択したオプション: ${message.option}`);
                        return;
                }
            },
            undefined,
            context.subscriptions
        );
    });

    context.subscriptions.push(disposable);

    // コードのホバー時にコマンドを表示
    context.subscriptions.push(
        vscode.languages.registerHoverProvider('*', {
            provideHover(document, position) {
                const hoverContent = new vscode.MarkdownString(`この単語をクリックして選択肢を表示します。`);
                hoverContent.appendMarkdown(`[選択肢を表示](command:extension.showOptions)`);
                return new vscode.Hover(hoverContent);
            }
        })
    );

    /*
    // エディタの変化を監視し、2秒後に変数名提案を取得
    const debouncedProcessChange = debounce(async (document) => {
        const text = document.getText();

        try {
            // 変数名の提案をGemini APIから取得
            suggestions =  await getVariableSuggestions(text);
            console.log('Completion items:', suggestions);
            // 提案が更新されたことを通知
            vscode.window.showInformationMessage('New variable name suggestions available.');
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to fetch suggestions: ${error.message}`);
        }

    }, 2000);  // 2秒間のデバウンスを設定

    // ドキュメントの変更を監視
    vscode.workspace.onDidChangeTextDocument(event => {
        const document = event.document;
        // ドキュメント変更時にデバウンス関数を呼び出す
        debouncedProcessChange(document);
        
    });
    */
}

// Webviewに表示するHTMLコンテンツを生成
function getWebviewContent() {
    return `<!DOCTYPE html>
    <html lang="ja">
    <body>
        <h1>選択肢</h1>
        <button onclick="selectOption('選択肢1')">選択肢1</button>
        <button onclick="selectOption('選択肢2')">選択肢2</button>

        <script>
            const vscode = acquireVsCodeApi();
            function selectOption(option) {
                vscode.postMessage({ command: 'selectOption', option: option });
            }
        </script>
    </body>
    </html>`;
}

function debounce(func, wait) {
    let timeout;
    return (...args) => {
        if (timeout) {
            clearTimeout(timeout);
        }
        timeout = setTimeout(() => {
            func(...args);
        }, wait);
    };
}

async function reviewCodeWithGemini(code){

    // Gemini APIのモデルを利用した変数名提案処理（ここは疑似コードのまま）
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-pro" });

        const prompt = `次のコードをレビューしてください${code}`;
        const result = await model.generateContentStream(prompt);

        displayReviewResult(result);

    } catch (error) {
        vscode.window.showErrorMessage(`Gemini API request failed: ${error.message}`);
        return [];
    }
}


async function getVariableSuggestions(code) {
    // Gemini APIのモデルを利用した変数名提案処理（ここは疑似コードのまま）
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-pro" });

        const prompt = `次のコードから変数やユーザ定義のオブジェクトやメソッドを検出して、\
        処理の内容や値の内容に適切な名前を考えて、JOSN形式でoldNameとnewNameを次のように出力してください。最後の','は必要ありません。\n[{"oldName": "a", "newName": "SuggestedA"},\n{"oldName": "b", "newName": "SuggestedB"}]\n${code}`;
        const result = await model.generateContentStream(prompt);
        
        let rowText = '';
        for await(const chunk of result.stream) {
            rowText += chunk.text();  // すべての結果を結合
        }
        
        let suggestions = JSON.parse(rowText.trim());
        console.log("Suggestions" + suggestions);

        displayReviewResult(suggestions);

        return suggestions;

    } catch (error) {
        vscode.window.showErrorMessage(`Gemini API request failed: ${error.message}`);
    }
}
    
async function displayReviewResult(result) {
    const outputChannel = vscode.window.createOutputChannel('Code Review Results');
    outputChannel.appendLine('Code Review Results:');

    outputChannel.show();
}

// This method is called when your extension is deactivated
function deactivate() {}

module.exports = {
	activate,
	deactivate
}
