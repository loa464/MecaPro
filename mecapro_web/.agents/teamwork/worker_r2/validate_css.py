with open('public/css/styles.css', 'r', encoding='utf-8') as f:
    css = f.read()

# Check balanced braces
open_braces = css.count('{')
close_braces = css.count('}')
open_parens = css.count('(')
close_parens = css.count(')')

print(f"Braces: {open_braces} open, {close_braces} close -> {'BALANCED' if open_braces == close_braces else 'UNBALANCED'}")
print(f"Parens: {open_parens} open, {close_parens} close -> {'BALANCED' if open_parens == close_parens else 'UNBALANCED'}")
