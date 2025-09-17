import {useState} from "react";
import {File, Folder} from "lucide-react";
import {Card} from "@/components/ui/card";
import {Button} from "@/components/ui/button";
import clsx from "clsx";

// Types
type Status = "match" | "differ" | "missingSrc" | "missingDst";

type TreeNodeData = {
    __children: Record<string, TreeNodeData>;
    __status: Status;
};

type TreesResult = {
    srcTree: Record<string, TreeNodeData>;
    dstTree: Record<string, TreeNodeData>;
    counts: { match: number; differ: number; missingSrc: number; missingDst: number };
};

type InputKey = "match" | "differ" | "missingSrc" | "missingDst" | "combined";

function parseReportData(
    match: string[],
    differ: string[],
    missingSrc: string[],
    missingDst: string[]
): TreesResult {
    const srcTree: Record<string, TreeNodeData> = {};
    const dstTree: Record<string, TreeNodeData> = {};

    const markTree = (
        tree: Record<string, TreeNodeData>,
        list: string[],
        status: Status
    ) => {
        for (const file of list) {
            const parts = file.split("/");
            let nodeRef = tree;
            for (let i = 0; i < parts.length; i++) {
                const part = parts[i]!;
                if (!nodeRef[part]) nodeRef[part] = {__children: {}, __status: "match"};
                if (i === parts.length - 1) nodeRef[part].__status = status;
                nodeRef = nodeRef[part].__children;
            }
        }
    };

    markTree(srcTree, [...match, ...differ, ...missingDst], "match");
    markTree(srcTree, missingDst, "missingDst");
    markTree(srcTree, differ, "differ");

    markTree(dstTree, [...match, ...differ, ...missingSrc], "match");
    markTree(dstTree, missingSrc, "missingSrc");
    markTree(dstTree, differ, "differ");

    const propagateStatus = (node: TreeNodeData): Status => {
        const children = Object.values(node.__children);
        if (children.length === 0) return node.__status;

        const statuses = new Set(children.map(propagateStatus));
        if (statuses.size === 1 && statuses.has("match")) {
            node.__status = "match";
        } else if (statuses.size === 1 && statuses.has("missingSrc")) {
            node.__status = "missingSrc";
        } else if (statuses.size === 1 && statuses.has("missingDst")) {
            node.__status = "missingDst";
        } else {
            node.__status = "differ";
        }
        return node.__status;
    };

    const applyPropagate = (tree: Record<string, TreeNodeData>) => {
        for (const key in tree) {
            propagateStatus(tree[key]!);
        }
    };

    applyPropagate(srcTree);
    applyPropagate(dstTree);

    return {
        srcTree,
        dstTree,
        counts: {
            match: match.length,
            differ: differ.length,
            missingSrc: missingSrc.length,
            missingDst: missingDst.length,
        },
    };
}

function parseCombinedReport(combinedText: string): TreesResult {
    const match: string[] = [];
    const differ: string[] = [];
    const missingSrc: string[] = [];
    const missingDst: string[] = [];
    const lines = combinedText
        .split("\n")
        .map((l: string) => l.trim())
        .filter(Boolean);

    for (const line of lines) {
        const symbol = line[0];
        const path = line.slice(2);
        if (symbol === "=") match.push(path);
        else if (symbol === "-") missingSrc.push(path);
        else if (symbol === "+") missingDst.push(path);
        else if (symbol === "*") differ.push(path);
    }

    return parseReportData(match, differ, missingSrc, missingDst);
}

function TreeNode({name, data, hideMatches}: { name: string; data: TreeNodeData; hideMatches: boolean }) {
    const [open, setOpen] = useState(false);
    const isFile = Object.keys(data.__children).length === 0;

    const colorMap: Record<Status, string> = {
        match: "text-gray-500",
        differ: "text-orange-500",
        missingSrc: "text-blue-600",
        missingDst: "text-blue-600",
    };

    const status: Status = data.__status || "match";
    const colorClass = colorMap[status] || "text-black";

    if (hideMatches && status === "match") return null;

    return (
        <div className="pl-4">
            <div
                className={clsx("flex items-center space-x-1 cursor-pointer", colorClass)}
                onClick={() => setOpen(!open)}
            >
                {isFile ? <File size={16}/> : <Folder size={16}/>}
                <span>{name}</span>
            </div>
            {!isFile && open && (
                <div>
                    {Object.entries(data.__children).map(([key, value]) => (
                        <TreeNode key={key} name={key} data={value} hideMatches={hideMatches}/>
                    ))}
                </div>
            )}
        </div>
    );
}

export default function App() {
    const [trees, setTrees] = useState<TreesResult | null>(null);
    const [inputs, setInputs] = useState<{
        match: string;
        differ: string;
        missingSrc: string;
        missingDst: string;
        combined: string;
    }>({
        match: "",
        differ: "",
        missingSrc: "",
        missingDst: "",
        combined: "",
    });
    const [hideMatches, setHideMatches] = useState(false);
    const [useCombined, setUseCombined] = useState(false);

    const handleChange = (key: InputKey, value: string) => {
        setInputs((prev) => ({...prev, [key]: value}));
    };

    const handleFileUpload = (key: InputKey, file: File) => {
        const reader = new FileReader();
        reader.onload = (e: ProgressEvent<FileReader>) => {
            const text = e.target?.result;
            if (typeof text === "string") {
                handleChange(key, text);
            }
        };
        reader.readAsText(file);
    };

    const handleGenerate = () => {
        if (useCombined && inputs.combined) {
            const result = parseCombinedReport(inputs.combined);
            setTrees(result);
        } else {
            const parseLines = (text: string) =>
                text.split("\n").map((l: string) => l.trim()).filter(Boolean);
            const result = parseReportData(
                parseLines(inputs.match),
                parseLines(inputs.differ),
                parseLines(inputs.missingSrc),
                parseLines(inputs.missingDst)
            );
            setTrees(result);
        }
    };

    return (
        <div className="p-4 space-y-4">
            <Card className="p-4">
                <h2 className="text-xl font-semibold mb-2">Input Reports</h2>
                <div className="mb-4">
                    <label className="flex items-center space-x-2">
                        <input
                            type="checkbox"
                            checked={useCombined}
                            onChange={(e) => setUseCombined(e.target.checked)}
                        />
                        <span className="text-sm">Use --combined report</span>
                    </label>
                </div>
                {useCombined ? (
                    <div>
                        <label className="text-sm block mb-1">Combined:</label>
                        <textarea
                            className="w-full border rounded p-1 text-sm mb-2"
                            rows={6}
                            value={inputs.combined}
                            onChange={(e) => handleChange("combined", e.target.value)}
                        />
                        <input
                            type="file"
                            accept=".txt"
                            onChange={(e) =>
                                e.target.files && handleFileUpload("combined", e.target.files[0]!)
                            }
                        />
                    </div>
                ) : (
                    <div className="grid grid-cols-2 gap-4">
                        {(["match", "differ", "missingSrc", "missingDst"] as const).map((key) => (
                            <div key={key}>
                                <label className="capitalize text-sm block mb-1">{key}:</label>
                                <textarea
                                    className="w-full border rounded p-1 text-sm mb-2"
                                    rows={4}
                                    value={inputs[key]}
                                    onChange={(e) => handleChange(key, e.target.value)}
                                />
                                <input
                                    type="file"
                                    accept=".txt"
                                    onChange={(e) =>
                                        e.target.files && handleFileUpload(key, e.target.files[0]!)
                                    }
                                />
                            </div>
                        ))}
                    </div>
                )}
                <div className="mt-4">
                    <label className="flex items-center space-x-2">
                        <input
                            type="checkbox"
                            checked={hideMatches}
                            onChange={(e) => setHideMatches(e.target.checked)}
                        />
                        <span className="text-sm">Hide matching files/folders</span>
                    </label>
                </div>
                <Button className="mt-4" onClick={handleGenerate}>
                    Generate File Trees
                </Button>
            </Card>

            {trees ? (
                <>
                    <div className="text-sm flex space-x-6">
                        <span className="text-gray-500">■ Identical: {trees.counts.match}</span>
                        <span className="text-orange-500">■ Differ: {trees.counts.differ}</span>
                        <span className="text-blue-600">■ Additional (Source): {trees.counts.missingDst}</span>
                        <span className="text-blue-600">■ Additional (Remote): {trees.counts.missingSrc}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <Card className="p-4 overflow-auto">
                            <h2 className="text-xl font-semibold mb-2">Source Tree</h2>
                            <div className="text-sm">
                                {Object.entries(trees.srcTree).map(([key, value]) => (
                                    <TreeNode
                                        key={key}
                                        name={key}
                                        data={value}
                                        hideMatches={hideMatches}
                                    />
                                ))}
                            </div>
                        </Card>

                        <Card className="p-4 overflow-auto">
                            <h2 className="text-xl font-semibold mb-2">Remote Tree</h2>
                            <div className="text-sm">
                                {Object.entries(trees.dstTree).map(([key, value]) => (
                                    <TreeNode
                                        key={key}
                                        name={key}
                                        data={value}
                                        hideMatches={hideMatches}
                                    />
                                ))}
                            </div>
                        </Card>
                    </div>
                </>
            ) : (
                <Card className="p-4 text-gray-500">No data loaded yet.</Card>
            )}
        </div>
    );
}
