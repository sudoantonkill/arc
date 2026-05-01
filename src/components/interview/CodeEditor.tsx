import * as React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Copy, Play, RotateCcw, Moon, Sun, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useCodeSession } from "@/hooks/useCodeSession";

interface CodeEditorProps {
    bookingId: string;
    readOnly?: boolean;
}

const LANGUAGES = [
    { value: 'javascript', label: 'JavaScript', extension: 'js' },
    { value: 'typescript', label: 'TypeScript', extension: 'ts' },
    { value: 'python', label: 'Python', extension: 'py' },
    { value: 'java', label: 'Java', extension: 'java' },
    { value: 'cpp', label: 'C++', extension: 'cpp' },
    { value: 'go', label: 'Go', extension: 'go' },
    { value: 'rust', label: 'Rust', extension: 'rs' },
];

const DEFAULT_CODE: Record<string, string> = {
    javascript: `// Welcome to your interview!
// Write your solution here

function solution(input) {
  // Your code here
  return input;
}

// Test your solution
console.log(solution("Hello"));
`,
    typescript: `// Welcome to your interview!
// Write your solution here

function solution(input: string): string {
  // Your code here
  return input;
}

// Test your solution
console.log(solution("Hello"));
`,
    python: `# Welcome to your interview!
# Write your solution here

def solution(input):
    # Your code here
    return input

# Test your solution
print(solution("Hello"))
`,
    java: `// Welcome to your interview!
// Write your solution here

public class Solution {
    public static String solution(String input) {
        // Your code here
        return input;
    }
    
    public static void main(String[] args) {
        System.out.println(solution("Hello"));
    }
}
`,
    cpp: `// Welcome to your interview!
// Write your solution here

#include <iostream>
#include <string>
using namespace std;

string solution(string input) {
    // Your code here
    return input;
}

int main() {
    cout << solution("Hello") << endl;
    return 0;
}
`,
    go: `// Welcome to your interview!
// Write your solution here

package main

import "fmt"

func solution(input string) string {
    // Your code here
    return input
}

func main() {
    fmt.Println(solution("Hello"))
}
`,
    rust: `// Welcome to your interview!
// Write your solution here

fn solution(input: &str) -> String {
    // Your code here
    input.to_string()
}

fn main() {
    println!("{}", solution("Hello"));
}
`,
};

export default function CodeEditor({ bookingId, readOnly = false }: CodeEditorProps) {
    const { toast } = useToast();
    const { codeSession, updateCode } = useCodeSession(bookingId);

    // Local state
    const [language, setLanguage] = React.useState('javascript');
    const [code, setCode] = React.useState(DEFAULT_CODE.javascript);
    const [theme, setTheme] = React.useState<'dark' | 'light'>('dark');
    const [output, setOutput] = React.useState<string>('');
    const [isExecuting, setIsExecuting] = React.useState<boolean>(false);
    const textareaRef = React.useRef<HTMLTextAreaElement>(null);
    const lastUpdateRef = React.useRef<number>(0);

    // Initial load & Sync from server
    React.useEffect(() => {
        if (codeSession) {
            // Only update if the server version is newer (or different) and we haven't typed recently
            // This is a naive conflict resolution for simplicity.
            // In a better world, use Yjs.
            const now = Date.now();
            if (now - lastUpdateRef.current > 2000) {
                if (codeSession.code !== code) setCode(codeSession.code);
                if (codeSession.language !== language) setLanguage(codeSession.language);
            }
        }
    }, [codeSession]);

    // Cleanup debounce timer
    const debounceRef = React.useRef<NodeJS.Timeout>();

    const handleChange = (newCode: string) => {
        setCode(newCode);
        lastUpdateRef.current = Date.now();

        if (debounceRef.current) clearTimeout(debounceRef.current);

        debounceRef.current = setTimeout(() => {
            updateCode.mutate({ code: newCode, language });
        }, 1000);
    };

    const handleLanguageChange = (newLang: string) => {
        setLanguage(newLang);
        const nextCode = DEFAULT_CODE[newLang] || '';

        // If switching language, we reset the code to default template? 
        // Or keep existing? Usually reset for interviews.
        // But if there is a session, we shouldn't reset if it's just a refresh.
        // However, this is an explicit user action to change language.
        if (code === DEFAULT_CODE[language] || code.trim() === '') {
            setCode(nextCode);
            // Sync immediately
            updateCode.mutate({ code: nextCode, language: newLang });
        } else {
            // Just update language tag
            updateCode.mutate({ code, language: newLang });
        }
    };

    const handleCopy = async () => {
        await navigator.clipboard.writeText(code);
        toast({ title: "Code copied to clipboard" });
    };

    const handleReset = () => {
        const nextCode = DEFAULT_CODE[language] || '';
        setCode(nextCode);
        setOutput('');
        updateCode.mutate({ code: nextCode, language });
    };

    const handleRun = async () => {
        setIsExecuting(true);
        setOutput('Running...');

        try {
            if (language === 'javascript' || language === 'typescript') {
                const logs: string[] = [];
                const mockConsole = {
                    log: (...args: unknown[]) => logs.push(args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ')),
                    error: (...args: unknown[]) => logs.push('ERROR: ' + args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ')),
                    warn: (...args: unknown[]) => logs.push('WARN: ' + args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ')),
                };

                const fn = new Function('console', `
                    try {
                        ${code}
                    } catch(e) {
                        console.error(e);
                    }
                `);
                fn(mockConsole);
                setOutput(logs.join('\n') || 'Code executed (no output)');

            } else if (language === 'python') {
                const logs: string[] = [];
                
                if (!(window as any).loadPyodide) {
                    setOutput('Loading Python runtime (this may take a moment on first run)...');
                    await new Promise((resolve, reject) => {
                        const script = document.createElement('script');
                        script.src = 'https://cdn.jsdelivr.net/pyodide/v0.25.0/full/pyodide.js';
                        script.onload = resolve;
                        script.onerror = reject;
                        document.body.appendChild(script);
                    });
                }
                
                if (!(window as any).pyodide) {
                    (window as any).pyodide = await (window as any).loadPyodide();
                }
                
                const pyodide = (window as any).pyodide;
                pyodide.setStdout({ batched: (text: string) => logs.push(text) });
                pyodide.setStderr({ batched: (text: string) => logs.push('ERROR: ' + text) });
                
                await pyodide.runPythonAsync(code);
                
                setOutput(logs.join('\n') || 'Code executed (no output)');

            } else {
                setOutput(`⚠️ Live browser execution is currently supported for JavaScript, TypeScript, and Python.\n\nIn a full production environment, ${LANGUAGES.find(l => l.value === language)?.label} would execute on secure backend workers.`);
            }
        } catch (error) {
            setOutput(`Error: ${error instanceof Error ? error.message : String(error)}`);
        } finally {
            setIsExecuting(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        // Tab support
        if (e.key === 'Tab') {
            e.preventDefault();
            const start = e.currentTarget.selectionStart;
            const end = e.currentTarget.selectionEnd;
            const newCode = code.substring(0, start) + '  ' + code.substring(end);
            setCode(newCode);
            // Set cursor position after tab
            setTimeout(() => {
                if (textareaRef.current) {
                    textareaRef.current.selectionStart = textareaRef.current.selectionEnd = start + 2;
                }
            }, 0);
        }
    };

    const lineCount = code.split('\n').length;

    return (
        <div className="h-full flex flex-col bg-card">
            {/* Toolbar */}
            <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/30">
                <div className="flex items-center gap-3">
                    <Select value={language} onValueChange={handleLanguageChange}>
                        <SelectTrigger className="w-[140px] h-8">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {LANGUAGES.map(lang => (
                                <SelectItem key={lang.value} value={lang.value}>
                                    {lang.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Badge variant="outline" className="text-xs font-mono">
                        {LANGUAGES.find(l => l.value === language)?.extension}
                    </Badge>
                </div>

                <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}>
                        {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={handleCopy}>
                        <Copy className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={handleReset}>
                        <RotateCcw className="h-4 w-4" />
                    </Button>
                    <Button size="sm" onClick={handleRun} disabled={isExecuting || readOnly}>
                        {isExecuting ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Play className="h-4 w-4 mr-1" />}
                        {isExecuting ? 'Running...' : 'Run'}
                    </Button>
                </div>
            </div>

            {/* Editor Area */}
            <div className="flex-1 flex overflow-hidden">
                {/* Line Numbers */}
                <div className={`w-12 flex-shrink-0 text-right pr-3 py-3 text-xs font-mono select-none ${theme === 'dark' ? 'bg-zinc-900 text-zinc-500' : 'bg-zinc-100 text-zinc-400'
                    }`}>
                    {Array.from({ length: lineCount }, (_, i) => (
                        <div key={i} className="leading-6">{i + 1}</div>
                    ))}
                </div>

                {/* Code Area */}
                <textarea
                    ref={textareaRef}
                    value={code}
                    onChange={(e) => handleChange(e.target.value)}
                    onKeyDown={handleKeyDown}
                    readOnly={readOnly}
                    spellCheck={false}
                    className={`flex-1 resize-none p-3 font-mono text-sm leading-6 focus:outline-none ${theme === 'dark'
                        ? 'bg-zinc-900 text-zinc-100'
                        : 'bg-white text-zinc-900'
                        } ${readOnly ? 'opacity-50 cursor-not-allowed' : ''}`}
                    placeholder="Start typing your code..."
                />
            </div>

            {/* Output Panel */}
            {output && (
                <div className={`h-32 border-t overflow-auto ${theme === 'dark' ? 'bg-zinc-950' : 'bg-zinc-50'
                    }`}>
                    <div className="px-4 py-2 border-b bg-muted/30 text-xs font-medium">Output</div>
                    <pre className={`p-4 text-sm font-mono whitespace-pre-wrap ${output.startsWith('Error') ? 'text-red-500' : theme === 'dark' ? 'text-green-400' : 'text-green-600'
                        }`}>
                        {output}
                    </pre>
                </div>
            )}
        </div>
    );
}
