# extract_project_snapshot.py

file_paths = [
    r"C:\Projects\Basic_trading_system\app\globals.css",
    r"C:\Projects\Basic_trading_system\app\layout.tsx",
    r"C:\Projects\Basic_trading_system\app\page.tsx",
    r"C:\Projects\Basic_trading_system\components\ui\label.tsx",
    r"C:\Projects\Basic_trading_system\components\ui\scroll-area.tsx",
    r"C:\Projects\Basic_trading_system\components\ui\select.tsx",
    r"C:\Projects\Basic_trading_system\components\ui\table.tsx",
    r"C:\Projects\Basic_trading_system\components\analysis-section.tsx",
    r"C:\Projects\Basic_trading_system\components\average-prices.tsx",
    r"C:\Projects\Basic_trading_system\components\notification-panel.tsx",
    r"C:\Projects\Basic_trading_system\components\theme-provider.tsx",
    r"C:\Projects\Basic_trading_system\components\trade-form.tsx",
    r"C:\Projects\Basic_trading_system\components\trade-table.tsx",
    r"C:\Projects\Basic_trading_system\styles\globals.css",
    r"C:\Projects\Basic_trading_system\main.py",
    r"C:\Projects\Basic_trading_system\components\ui\badge.tsx",
    r"C:\Projects\Basic_trading_system\components\ui\card.tsx",
    r"C:\Projects\Basic_trading_system\components\ui\use-toast.ts",
    r"C:\Projects\Basic_trading_system\components\ui\button.tsx",
    r"C:\Projects\Basic_trading_system\tsconfig.json"
]

output_file = "project_snapshot.txt"

with open(output_file, "w", encoding="utf-8") as out:
    for path in file_paths:
        try:
            with open(path, "r", encoding="utf-8") as f:
                content = f.read()
            out.write(f"{path}:\n")
            out.write(content)
            out.write("\n" + "-" * 100 + "\n\n")
        except Exception as e:
            out.write(f"{path}:\nERROR READING FILE: {e}\n")
            out.write("\n" + "-" * 100 + "\n\n")

print(f"\n✅ Done! Output saved to {output_file}")
