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

    let disposable = vscode.commands.registerCommand('tt.reviewCode', async () => {
        // エディターのアクティブなテキストを取得
        const editor = vscode.window.activeTextEditor;

        if (!editor) {
            vscode.window.showErrorMessage('エディターがアクティブではありません。');
            return;
        }

        const selection = editor.selection;
        let selectedText = editor.document.getText(selection);

        if (!selectedText) {
            
            selectedText = editor.document.getText();
        }

        // Gemini APIに選択したコードを送信
        const reviewResult = await reviewCodeWithGemini(selectedText);

        // Webviewまたはエディターでレビュー結果を表示
        displayReviewResult(reviewResult);
    });

    context.subscriptions.push(disposable);

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

    context.subscriptions.push(
        vscode.languages.registerHoverProvider('*', {
            provideHover(document, position) {
                const wordRange = document.getWordRangeAtPosition(position);
                const word = document.getText(wordRange);
    
                // 検出された単語に一致する提案を検索
                const suggestion = suggestions.find(s => s.oldName === word);
    
                if (suggestion) {
                    const hoverContent = new vscode.MarkdownString(`この単語に提案があります。`);
                    
                    // Markdownにリンクを追加して提案名を表示
                    hoverContent.appendMarkdown(`\n**${suggestion.oldName}** を **${suggestion.newName}** に置き換えますか？`);
                    hoverContent.appendMarkdown(`\n[**置き換える**](command:tt.replaceVariable)`);
                    
                    return new vscode.Hover(hoverContent);
                } else {
                    return; // 提案がない場合はホバーを表示しない
                }
            }
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('tt.replaceVariable', async (oldName, newName) => {
            const editor = vscode.window.activeTextEditor;
            if (editor) {
                const document = editor.document;
                await replaceVariable(document, oldName, newName);
                vscode.window.showInformationMessage(`変数名を "${oldName}" から "${newName}" に置き換えました。`);
            }
        })
    );

    
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

async function replaceVariable(document, oldName, newName) {
    const text = document.getText();
    
    // 正規表現で古い変数名を検索
    const regex = new RegExp(`\\b${oldName}\\b`, 'g'); // 単語境界を指定
    const newText = text.replace(regex, newName);

    // ドキュメントを更新
    const edit = new vscode.TextEdit(new vscode.Range(0, 0, document.lineCount, 0), newText);
    const workspaceEdit = new vscode.WorkspaceEdit();
    workspaceEdit.set(document.uri, [edit]);

    // 変更を適用
    await vscode.workspace.applyEdit(workspaceEdit);
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
        処理の内容や値の内容に適切な名前を2つずつ考えて、JOSN形式でoldNameとnewNameを次のように出力してください。最後の','は必要ありません。\n[{"oldName": "a", "newName": "SuggestedA"},\n{"oldName": "b", "newName": "SuggestedB"}]\n${code}`;
        const result = await model.generateContentStream(prompt);
        
        let rowText = '';
        for await(const chunk of result.stream) {
            rowText += chunk.text();  // すべての結果を結合
        }
        
        let suggestions = JSON.parse(rowText.trim());
        console.log("Suggestions" + suggestions);

        return suggestions;

    } catch (error) {
        vscode.window.showErrorMessage(`Gemini API request failed: ${error.message}`);
    }
}
    
async function displayReviewResult(result) {
    const outputChannel = vscode.window.createOutputChannel('Code Review Results');
    outputChannel.appendLine('Code Review Results:');

    let text = '';
    
    // Stream結果を非同期で処理してテキストを生成
    for await (const chunk of result.stream) {
        const chunkText = chunk.text(); // それぞれのチャンクからテキストを取得
        console.log(chunkText); // コンソールに出力
        text += chunkText;
    }

    // アウトプットチャネルにテキストを表示
    outputChannel.append(text);
    outputChannel.show(); // エディタ内で出力を表示
}

// This method is called when your extension is deactivated
function deactivate() {}

module.exports = {
	activate,
	deactivate
}
