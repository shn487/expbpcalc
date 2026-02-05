/**
 * EXP/BP Calculator Logic
 */

// --- Global Constants & State ---
const MODES = {
    COOP4: '4p',
    COOP2: '2p',
    SOLO: 'solo'
};

// Data structure to hold state for each tab independently
const state = {
    [MODES.COOP4]: createInitialState(),
    [MODES.COOP2]: createInitialState(),
    [MODES.SOLO]: createInitialState()
};

function createInitialState() {
    return {
        baseExp: 0,
        baseBp: 0,
        book: 1,
        lsExp: 0,
        lsBp: 0,
        coopCount: 4, // Default
        mutual: 0,
        returnBonus: 0,
        friendLs: 0,
        // Character table data: 5 chars, each has EXP/BP arrays of values
        chars: Array(5).fill(null).map(() => ({
            expStats: Array(9).fill(0), // 9 columns before total
            bpStats: Array(9).fill(0),
            selected: false // For 2P/Solo selection
        }))
    };
}

// Current active tab
let currentMode = MODES.COOP4;


// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    initTabs();
    initUI();
});

function initTabs() {
    const tabBtns = document.querySelectorAll('.tab-btn');
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            // UI Toggle
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            const newMode = btn.dataset.tab;
            switchTab(newMode);
        });
    });
}

function switchTab(mode) {
    currentMode = mode;

    // Hide all contents
    document.querySelectorAll('.tab-content').forEach(div => div.style.display = 'none');

    // Show current content
    const activeTab = document.getElementById(`tab-${mode}`);
    activeTab.style.display = 'block';

    // If content not yet generated, generate it
    if (activeTab.children.length === 0) {
        activeTab.innerHTML = ''; // Clear comments
        renderTabContent(mode, activeTab);
    }
}

function initUI() {
    // Initial render for the default active tab (4p)
    switchTab(MODES.COOP4);
}

// --- Rendering ---

function renderTabContent(mode, container) {
    const template = document.getElementById('calc-structure-template');
    const clone = template.content.cloneNode(true);

    // Customize Clone based on Mode

    // 1. Hide/Show specific inputs
    const coopInputs = clone.querySelectorAll('.coop-only');
    const soloInputs = clone.querySelectorAll('.solo-only');
    const bpSection = clone.querySelector('.bp-section');
    const baseBpGroup = clone.querySelector('.bp-group');
    const charSelectCard = clone.querySelector('.char-select-card');

    if (mode === MODES.SOLO) {
        coopInputs.forEach(el => el.style.display = 'none');
        soloInputs.forEach(el => el.style.display = 'flex'); // Show friend LS
        bpSection.style.display = 'none'; // No BP table for Solo
        baseBpGroup.style.display = 'none'; // No Base BP for Solo
        charSelectCard.style.display = 'block'; // Enable Char Select
    } else if (mode === MODES.COOP2) {
        coopInputs.forEach(el => el.style.display = 'flex');
        soloInputs.forEach(el => el.style.display = 'none');
        charSelectCard.style.display = 'block'; // Enable Char Select
    } else {
        // 4P
        coopInputs.forEach(el => el.style.display = 'flex');
        soloInputs.forEach(el => el.style.display = 'none');
        // Char select hidden for 4P (all chars shown in result)
    }

    // 2. Setup Coop Count defaults/limits
    const coopCountInput = clone.querySelector('.coop-count');
    if (mode === MODES.COOP2) {
        coopCountInput.max = 2;
        coopCountInput.value = 2;
    }

    // 3. Render Tables (EXP & BP)
    const expTbody = clone.querySelector('.exp-table tbody');
    const bpTbody = clone.querySelector('.bp-table tbody');

    // Generate 5 rows for Characters
    for (let i = 0; i < 5; i++) {
        expTbody.appendChild(createTableRow(mode, i, 'exp'));
        if (mode !== MODES.SOLO) {
            bpTbody.appendChild(createTableRow(mode, i, 'bp'));
        }
    }

    // 4. Render Character Selection (if active)
    if (mode !== MODES.COOP4) {
        const charSelectContainer = clone.querySelector('.char-select-container');
        for (let i = 0; i < 5; i++) {
            const label = document.createElement('label');
            label.className = 'char-checkbox-label';
            label.innerHTML = `<input type="checkbox" class="char-select-cb" data-char-idx="${i}"> キャラ${i + 1}`;

            // Add listener
            label.querySelector('input').addEventListener('change', (e) => {
                state[mode].chars[i].selected = e.target.checked;
                recalcAll(mode, container);
            });

            charSelectContainer.appendChild(label);
        }
    }

    // 5. Attach Event Listeners to inputs
    attachInputListeners(mode, clone, container);

    // Initial Calc
    container.appendChild(clone);
    recalcAll(mode, container);
}

function createTableRow(mode, charIdx, type) {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td class="sticky-col">キャラ${charIdx + 1}</td>`;

    // 9 input columns
    for (let col = 0; col < 9; col++) {
        const td = document.createElement('td');
        const input = document.createElement('input');
        input.type = 'number';
        input.value = 0;
        input.dataset.charIdx = charIdx;
        input.dataset.colIdx = col;
        input.dataset.type = type;

        // Input validation/handling
        input.addEventListener('input', (e) => {
            const val = parseFloat(e.target.value) || 0;
            if (type === 'exp') state[mode].chars[charIdx].expStats[col] = val;
            else state[mode].chars[charIdx].bpStats[col] = val;

            updateRowTotal(mode, charIdx, type);
        });

        td.appendChild(input);
        tr.appendChild(td);
    }

    // Total column
    const tdTotal = document.createElement('td');
    tdTotal.className = 'total-cell';
    tdTotal.id = `${mode}-${type}-total-${charIdx}`;
    tdTotal.textContent = '0%';
    tr.appendChild(tdTotal);

    return tr;
}

function attachInputListeners(mode, rootInfo, container) {
    // Helper to add listener
    const addListener = (selector, key, parse = true) => {
        const el = rootInfo.querySelector(selector);
        if (!el) return;
        el.addEventListener('input', (e) => {
            state[mode][key] = parse ? (parseFloat(e.target.value) || 0) : e.target.value;
            recalcAll(mode, container);
        });
    };

    addListener('.base-exp', 'baseExp');
    addListener('.base-bp', 'baseBp');
    addListener('.book-select', 'book');
    addListener('.ls-exp', 'lsExp');
    addListener('.ls-bp', 'lsBp');
    addListener('.coop-count', 'coopCount');
    addListener('.mutual-follow', 'mutual');
    addListener('.return-bonus', 'returnBonus');
    addListener('.friend-ls', 'friendLs');
}


// --- Calculation Logic ---

function updateRowTotal(mode, charIdx, type) {
    const charData = state[mode].chars[charIdx];
    const stats = type === 'exp' ? charData.expStats : charData.bpStats;
    const sum = stats.reduce((a, b) => a + b, 0);

    const cellId = `${mode}-${type}-total-${charIdx}`;
    const cell = document.getElementById(cellId);
    if (cell) cell.textContent = sum + '%';

    // After updating row total, we need to recalc final results
    const container = document.getElementById(`tab-${mode}`);
    recalcAll(mode, container);
}

function recalcAll(mode, container) {
    const s = state[mode];
    const resultsDiv = container.querySelector('.result-display');
    const runsTableBody = container.querySelector('.runs-table tbody');
    const runsTableHead = container.querySelector('.runs-table thead');

    resultsDiv.innerHTML = '';
    runsTableBody.innerHTML = '';
    runsTableHead.innerHTML = '';

    // Calculate Final EXP/BP
    // 4P: List results for all 5 characters
    // 2P/Solo: Sum selected characters' totals -> Single result

    let results = []; // Array of result objects { label, exp, bp }

    if (mode === MODES.COOP4) {
        // 4P: Calculate for each char independently
        for (let i = 0; i < 5; i++) {
            const char = s.chars[i];
            const expTotal = char.expStats.reduce((a, b) => a + b, 0);
            const bpTotal = char.bpStats.reduce((a, b) => a + b, 0);

            // Formula:
            // Exp = Base * (1 + (LS + CharBonus)/100) * (1 + 0.5*Count + Mutual/100 + Return/100) * Book
            const expPercent = s.lsExp + expTotal;
            const coopBonuses = (0.5 * s.coopCount) + (s.mutual / 100) + (s.returnBonus / 100);
            const exp = s.baseExp * (1 + expPercent / 100) * (1 + coopBonuses) * s.book;

            // BP = Base * (1 + (LS_BP + BPTotal)/100)
            const bpPercent = s.lsBp + bpTotal;
            const bp = s.baseBp * (1 + bpPercent / 100);

            results.push({
                label: `キャラ${i + 1}`,
                exp: Math.floor(exp),
                bp: Math.floor(bp)
            });
        }
    } else {
        // 2P or Solo: Aggregate Selection
        const selectedChars = s.chars.filter(c => c.selected);

        if (selectedChars.length === 0) {
            resultsDiv.innerHTML = '<p style="text-align:center; color:#A0AAB6; margin-top:20px;">計算対象のキャラを選択してください</p>';
            return;
        }

        // Sum modifiers of selected chars
        const sumExpMods = selectedChars.reduce((sum, c) => sum + c.expStats.reduce((a, b) => a + b, 0), 0);
        const sumBpMods = selectedChars.reduce((sum, c) => sum + c.bpStats.reduce((a, b) => a + b, 0), 0);

        let exp = 0;
        let bp = 0;

        if (mode === MODES.SOLO) {
            // Solo Formula:
            // Exp = Base * (1 + (LS + FriendLS + SumCharMods)/100) * Book
            const totalExpPercent = s.lsExp + s.friendLs + sumExpMods;
            exp = s.baseExp * (1 + totalExpPercent / 100) * s.book;

            // BP is 0 for Solo (spec says not calculated/shown)
            bp = 0;
        } else {
            // 2P Formula:
            // Exp = Base * (1 + (LS + SumCharMods)/100) * (1 + 0.5*Count + Mutual/100 + Return/100) * Book
            const totalExpPercent = s.lsExp + sumExpMods;
            const coopBonuses = (0.5 * s.coopCount) + (s.mutual / 100) + (s.returnBonus / 100);
            exp = s.baseExp * (1 + totalExpPercent / 100) * (1 + coopBonuses) * s.book;

            // BP = Base * (1 + (LS_BP + SumBpMods)/100)
            const totalBpPercent = s.lsBp + sumBpMods;
            bp = s.baseBp * (1 + totalBpPercent / 100);
        }

        results.push({
            label: '合計結果',
            exp: Math.floor(exp),
            bp: Math.floor(bp)
        });
    }

    // Render Result Card
    results.forEach(val => {
        const div = document.createElement('div');
        div.className = 'result-item';
        div.innerHTML = `
            <h3>${val.label}</h3>
            <div class="result-value exp">EXP: ${val.exp.toLocaleString()}</div>
            ${mode !== MODES.SOLO ? `<div class="result-value bp">BP: ${val.bp.toLocaleString()}</div>` : ''}
        `;
        resultsDiv.appendChild(div);
    });

    // Render Runs Table (100 -> 1)
    // Build Header
    let headRow = '<tr><th class="sticky-col">周回数</th>';
    results.forEach(res => {
        headRow += `<th>${res.label}<br>EXP${mode !== MODES.SOLO ? ' / BP' : ''}</th>`;
    });
    headRow += '</tr>';
    runsTableHead.innerHTML = headRow;

    // Build Body
    const fragment = document.createDocumentFragment();
    for (let run = 100; run >= 1; run--) {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td class="sticky-col">${run}</td>`;

        results.forEach(val => {
            const totalExp = val.exp * run;
            const totalBp = val.bp * run;

            let content = `<span class="exp-text">${totalExp.toLocaleString()}</span>`;
            if (mode !== MODES.SOLO) {
                content += `<br><span class="bp-text">${totalBp.toLocaleString()}</span>`;
            }

            const td = document.createElement('td');
            td.innerHTML = content;
            tr.appendChild(td);
        });
        fragment.appendChild(tr);
    }
    runsTableBody.appendChild(fragment);
}
