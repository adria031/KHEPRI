import re, os, sys

BASE = os.path.join(os.path.dirname(__file__), "..", "app", "dashboard")

def make_import(prefix):
    return (
        f"import {{ getNegocioActivo, type NegMin }} from '{prefix}lib/negocioActivo'\n"
        f"import {{ NegocioSelector }} from '{prefix}NegocioSelector'\n"
    )

def add_imports(src, prefix):
    return re.sub(
        r"(import \{ supabase \} from '.*?supabase')\n",
        r"\1\n" + make_import(prefix),
        src, count=1
    )

def add_todos_state(src):
    # After sidebarOpen state
    s = re.sub(
        r"(const \[sidebarOpen, setSidebarOpen\] = useState\(false\))",
        r"\1\n  const [todosNegocios, setTodosNegocios] = useState<NegMin[]>([])",
        src, count=1
    )
    if s != src:
        return s
    # After negocioId state
    return re.sub(
        r"(const \[negocioId, setNegocioId\] = useState<string \| null>\(null\))",
        r"const [todosNegocios, setTodosNegocios] = useState<NegMin[]>([])\n  \1",
        src, count=1
    )

def add_selector_to_topbar(src, negocio_id_expr="negocioId??''"):
    # Pages with btn-nuevo: wrap btn-nuevo in flex div with selector
    s = re.sub(
        r"(            </div>\n)(            <button className=\"btn-nuevo\")",
        (
            r"\1"
            "            <div style={{display:'flex',alignItems:'center',gap:'8px'}}>\n"
            f"              <NegocioSelector negocios={{todosNegocios}} activoId={{{negocio_id_expr}}} />\n"
            r"\2"
        ),
        src, count=1
    )
    if s != src:
        # Need to close the wrapper div — find the btn-nuevo closing line
        # The btn-nuevo button ends with </button> then a newline then </header>
        s = re.sub(
            r"(              </button>\n)(          </header>)",
            r"\1            </div>\n\2",
            s, count=1
        )
        return s
    # Pages without btn-nuevo: add selector just before </header>
    return re.sub(
        r"(            </div>\n)(          </header>)",
        (
            r"\1"
            f"            <NegocioSelector negocios={{todosNegocios}} activoId={{{negocio_id_expr}}} />\n"
            r"\2"
        ),
        src, count=1
    )

results = []

# ══════════════════════════════════════════════════════════════════════════════
# dashboard/page.tsx  (main — slightly different structure)
# ══════════════════════════════════════════════════════════════════════════════
p = os.path.join(BASE, "page.tsx")
src = open(p, encoding="utf-8").read()
orig = src

src = add_imports(src, "./")
src = add_todos_state(src)

# Replace main negocio fetch
src = re.sub(
    r"const \{ data: neg \} = await supabase\.from\('negocios'\)"
    r"\.select\('id, nombre, plan'\)\.eq\('user_id', user\.id\)\.single\(\)\n"
    r"      if \(!neg\) return\n"
    r"      setNegocio\(neg\)",
    "const { activo: neg, todos: todosNegs } = await getNegocioActivo(user.id)\n"
    "      if (!neg) return\n"
    "      setTodosNegocios(todosNegs)\n"
    "      setNegocio(neg)",
    src
)

# Main dashboard topbar: uses negocio?.nombre so activoId = negocio?.id || ''
src = add_selector_to_topbar(src, "negocio?.id??''")

if src != orig:
    open(p, "w", encoding="utf-8").write(src)
    results.append("OK  dashboard/page.tsx")
else:
    results.append("NO  dashboard/page.tsx")

# ══════════════════════════════════════════════════════════════════════════════
# servicios/page.tsx
# ══════════════════════════════════════════════════════════════════════════════
p = os.path.join(BASE, "servicios", "page.tsx")
src = open(p, encoding="utf-8").read(); orig = src

src = add_imports(src, "../../")
src = add_todos_state(src)

src = re.sub(
    r"const \{ data: negocio \} = await supabase\.from\('negocios'\)\.select\('id'\)"
    r"\.eq\('user_id', user\.id\)\.single\(\)\n"
    r"      if \(negocio\) \{\n"
    r"        setNegocioId\(negocio\.id\)\n"
    r"        cargarServicios\(negocio\.id\)\n"
    r"      \}",
    "const { activo: negocio, todos: todosNegs } = await getNegocioActivo(user.id)\n"
    "      if (!negocio) return\n"
    "      setTodosNegocios(todosNegs)\n"
    "      setNegocioId(negocio.id)\n"
    "      cargarServicios(negocio.id)",
    src
)
src = add_selector_to_topbar(src)

if src != orig:
    open(p, "w", encoding="utf-8").write(src)
    results.append("OK  servicios/page.tsx")
else:
    results.append("NO  servicios/page.tsx")

# ══════════════════════════════════════════════════════════════════════════════
# horarios/page.tsx
# ══════════════════════════════════════════════════════════════════════════════
p = os.path.join(BASE, "horarios", "page.tsx")
src = open(p, encoding="utf-8").read(); orig = src

src = add_imports(src, "../../")
src = add_todos_state(src)

src = re.sub(
    r"const \{ data: negocio \} = await supabase\.from\('negocios'\)\.select\('id'\)"
    r"\.eq\('user_id', user\.id\)\.single\(\)\n"
    r"      if \(negocio\) \{\n"
    r"        setNegocioId\(negocio\.id\)\n"
    r"      \}",
    "const { activo: negocio, todos: todosNegs } = await getNegocioActivo(user.id)\n"
    "      if (!negocio) return\n"
    "      setTodosNegocios(todosNegs)\n"
    "      setNegocioId(negocio.id)",
    src
)
src = add_selector_to_topbar(src)

if src != orig:
    open(p, "w", encoding="utf-8").write(src)
    results.append("OK  horarios/page.tsx")
else:
    results.append("NO  horarios/page.tsx")

# ══════════════════════════════════════════════════════════════════════════════
# reservas/page.tsx
# ══════════════════════════════════════════════════════════════════════════════
p = os.path.join(BASE, "reservas", "page.tsx")
src = open(p, encoding="utf-8").read(); orig = src

src = add_imports(src, "../../")
src = add_todos_state(src)

src = re.sub(
    r"const \{ data \} = await supabase\.from\('negocios'\)\.select\('id, nombre, plan'\)"
    r"\.eq\('user_id', user\.id\)\.single\(\)",
    "const { activo: data, todos: todosNegs } = await getNegocioActivo(user.id)\n"
    "      setTodosNegocios(todosNegs)",
    src
)
src = add_selector_to_topbar(src)

if src != orig:
    open(p, "w", encoding="utf-8").write(src)
    results.append("OK  reservas/page.tsx")
else:
    results.append("NO  reservas/page.tsx")

# ══════════════════════════════════════════════════════════════════════════════
# equipo/page.tsx
# ══════════════════════════════════════════════════════════════════════════════
p = os.path.join(BASE, "equipo", "page.tsx")
src = open(p, encoding="utf-8").read(); orig = src

src = add_imports(src, "../../")
src = add_todos_state(src)

src = re.sub(
    r"const \{ data: neg \} = await supabase\.from\('negocios'\)\.select\('id'\)"
    r"\.eq\('user_id', user\.id\)\.single\(\)\n"
    r"      if \(neg\) \{\n"
    r"        setNegocioId\(neg\.id\)\n"
    r"        const \{ data \} = await supabase\.from\('trabajadores'\)\.select\('\*'\)"
    r"\.eq\('negocio_id', neg\.id\)\.order\('nombre'\)",
    "const { activo: neg, todos: todosNegs } = await getNegocioActivo(user.id)\n"
    "      if (!neg) return\n"
    "      setTodosNegocios(todosNegs)\n"
    "      setNegocioId(neg.id)\n"
    "      const { data } = await supabase.from('trabajadores').select('*')"
    ".eq('negocio_id', neg.id).order('nombre')",
    src
)
src = add_selector_to_topbar(src)

if src != orig:
    open(p, "w", encoding="utf-8").write(src)
    results.append("OK  equipo/page.tsx")
else:
    results.append("NO  equipo/page.tsx")

# ══════════════════════════════════════════════════════════════════════════════
# productos/page.tsx
# ══════════════════════════════════════════════════════════════════════════════
p = os.path.join(BASE, "productos", "page.tsx")
src = open(p, encoding="utf-8").read(); orig = src

src = add_imports(src, "../../")
src = add_todos_state(src)

src = re.sub(
    r"const \{ data: neg \} = await supabase\.from\('negocios'\)\.select\('id'\)"
    r"\.eq\('user_id', user\.id\)\.single\(\)\n"
    r"      if \(neg\) \{\n"
    r"        setNegocioId\(neg\.id\)\n"
    r"        await cargarProductos\(neg\.id\)\n"
    r"      \}",
    "const { activo: neg, todos: todosNegs } = await getNegocioActivo(user.id)\n"
    "      if (!neg) return\n"
    "      setTodosNegocios(todosNegs)\n"
    "      setNegocioId(neg.id)\n"
    "      await cargarProductos(neg.id)",
    src
)
src = add_selector_to_topbar(src)

if src != orig:
    open(p, "w", encoding="utf-8").write(src)
    results.append("OK  productos/page.tsx")
else:
    results.append("NO  productos/page.tsx")

# ══════════════════════════════════════════════════════════════════════════════
# chatbot/page.tsx
# ══════════════════════════════════════════════════════════════════════════════
p = os.path.join(BASE, "chatbot", "page.tsx")
src = open(p, encoding="utf-8").read(); orig = src

src = add_imports(src, "../../")
src = add_todos_state(src)

src = re.sub(
    r"const \{ data: neg \} = await supabase\n"
    r"        \.from\('negocios'\)\n"
    r"        \.select\('id, nombre, tipo, descripcion, direccion, ciudad, telefono'\)\n"
    r"        \.eq\('user_id', user\.id\)\n"
    r"        \.single\(\)\n"
    r"      if \(!neg\) \{ setCargando\(false\); return \}",
    "const { activo: negBase, todos: todosNegs } = await getNegocioActivo(user.id)\n"
    "      if (!negBase) { setCargando(false); return }\n"
    "      setTodosNegocios(todosNegs)\n"
    "      // Re-fetch full fields for chatbot\n"
    "      const { data: neg } = await supabase.from('negocios')\n"
    "        .select('id, nombre, tipo, descripcion, direccion, ciudad, telefono')\n"
    "        .eq('id', negBase.id).single()\n"
    "      if (!neg) { setCargando(false); return }",
    src
)
src = add_selector_to_topbar(src)

if src != orig:
    open(p, "w", encoding="utf-8").write(src)
    results.append("OK  chatbot/page.tsx")
else:
    results.append("NO  chatbot/page.tsx")

# ══════════════════════════════════════════════════════════════════════════════
# facturacion/page.tsx
# ══════════════════════════════════════════════════════════════════════════════
p = os.path.join(BASE, "facturacion", "page.tsx")
src = open(p, encoding="utf-8").read(); orig = src

src = add_imports(src, "../../")
src = add_todos_state(src)

src = re.sub(
    r"const \{ data: neg \} = await supabase\.from\('negocios'\)\.select\('id, nombre'\)"
    r"\.eq\('user_id', user\.id\)\.single\(\)\n"
    r"      if \(neg\) \{\n"
    r"        setNegocioId\(neg\.id\)\n"
    r"        await cargarFacturas\(neg\.id, anio, mes\)\n"
    r"      \}",
    "const { activo: neg, todos: todosNegs } = await getNegocioActivo(user.id)\n"
    "      if (!neg) return\n"
    "      setTodosNegocios(todosNegs)\n"
    "      setNegocioId(neg.id)\n"
    "      await cargarFacturas(neg.id, anio, mes)",
    src
)
src = add_selector_to_topbar(src)

if src != orig:
    open(p, "w", encoding="utf-8").write(src)
    results.append("OK  facturacion/page.tsx")
else:
    results.append("NO  facturacion/page.tsx")

# ══════════════════════════════════════════════════════════════════════════════
# marketing/page.tsx
# ══════════════════════════════════════════════════════════════════════════════
p = os.path.join(BASE, "marketing", "page.tsx")
src = open(p, encoding="utf-8").read(); orig = src

src = add_imports(src, "../../")
src = add_todos_state(src)

src = re.sub(
    r"const \{ data \} = await supabase\.from\('negocios'\)\.select\('id, nombre'\)"
    r"\.eq\('user_id', user\.id\)\.single\(\)\n"
    r"      if \(data\) \{ setNegocioId\(data\.id\); setNegocioNombre\(data\.nombre\) \}",
    "const { activo: data, todos: todosNegs } = await getNegocioActivo(user.id)\n"
    "      setTodosNegocios(todosNegs)\n"
    "      if (data) { setNegocioId(data.id); setNegocioNombre(data.nombre) }",
    src
)
src = add_selector_to_topbar(src)

if src != orig:
    open(p, "w", encoding="utf-8").write(src)
    results.append("OK  marketing/page.tsx")
else:
    results.append("NO  marketing/page.tsx")

# ══════════════════════════════════════════════════════════════════════════════
# mi-negocio/page.tsx  (needs full row - re-fetch after resolving ID)
# ══════════════════════════════════════════════════════════════════════════════
p = os.path.join(BASE, "mi-negocio", "page.tsx")
src = open(p, encoding="utf-8").read(); orig = src

src = add_imports(src, "../../")
src = add_todos_state(src)

src = re.sub(
    r"const \{ data \} = await supabase\.from\('negocios'\)\.select\('\*'\)"
    r"\.eq\('user_id', user\.id\)\.single\(\)\n"
    r"      if \(data\) \{",
    "const { activo: negActivo, todos: todosNegs } = await getNegocioActivo(user.id)\n"
    "      setTodosNegocios(todosNegs)\n"
    "      const { data } = negActivo\n"
    "        ? await supabase.from('negocios').select('*').eq('id', negActivo.id).single()\n"
    "        : { data: null }\n"
    "      if (data) {",
    src
)
src = add_selector_to_topbar(src)

if src != orig:
    open(p, "w", encoding="utf-8").write(src)
    results.append("OK  mi-negocio/page.tsx")
else:
    results.append("NO  mi-negocio/page.tsx")

# ══════════════════════════════════════════════════════════════════════════════
# resenas/page.tsx
# ══════════════════════════════════════════════════════════════════════════════
p = os.path.join(BASE, "resenas", "page.tsx")
src = open(p, encoding="utf-8").read(); orig = src

src = add_imports(src, "../../")
src = add_todos_state(src)

src = re.sub(
    r"const \{ data: neg \} = await supabase\.from\('negocios'\)\.select\('id'\)"
    r"\.eq\('user_id', user\.id\)\.single\(\)\n"
    r"      if \(neg\) \{\n"
    r"        setNegocioId\(neg\.id\)",
    "const { activo: neg, todos: todosNegs } = await getNegocioActivo(user.id)\n"
    "      if (!neg) return\n"
    "      setTodosNegocios(todosNegs)\n"
    "      setNegocioId(neg.id)",
    src
)
# resenas has a direct filter after setNegocioId - need to close the old if block
src = re.sub(
    r"        setNegocioId\(neg\.id\)\n"
    r"        const \{ data: resenasData \}",
    "        setNegocioId(neg.id)\n"
    "        const { data: resenasData }",
    src
)
src = add_selector_to_topbar(src)

if src != orig:
    open(p, "w", encoding="utf-8").write(src)
    results.append("OK  resenas/page.tsx")
else:
    results.append("NO  resenas/page.tsx")

print("\n".join(results))
