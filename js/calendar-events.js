/**
 * Calendar Events Controller
 * Handles the display of the month grid, events on specific days, and the event list below it.
 */

let currentCalYear = new Date().getFullYear();
let currentCalMonth = new Date().getMonth();
let eventsCache = [];
let selectedDate = null; // format: 'YYYY-MM-DD'

document.addEventListener('DOMContentLoaded', () => {
    initEventCalendar();
});

async function initEventCalendar() {
    const grid = document.getElementById('calendar-grid-cells');
    if (!grid) return; // Not on a page with the calendar

    await fetchAndRenderCalendarEvents();
}

async function fetchAndRenderCalendarEvents() {
    try {
        if (window.DataManager && typeof window.DataManager.getEvents === 'function') {
            eventsCache = await window.DataManager.getEvents();
        } else {
            console.warn("DataManager.getEvents is not available yet.");
            eventsCache = [];
        }
    } catch (e) {
        console.error("Error fetching events for calendar:", e);
        eventsCache = [];
    }

    renderCalendarGrid();
    renderEventList();
}

function renderCalendarGrid() {
    const grid = document.getElementById('calendar-grid-cells');
    const monthYearLabel = document.getElementById('calendar-month-title');
    const pickerYearLabel = document.getElementById('picker-year-title');
    
    if (!grid) return;

    const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

    if (monthYearLabel) monthYearLabel.textContent = `${monthNames[currentCalMonth]} ${currentCalYear}`;
    if (pickerYearLabel) pickerYearLabel.textContent = currentCalYear;

    grid.innerHTML = '';

    const firstDay = new Date(currentCalYear, currentCalMonth, 1).getDay();
    const daysInMonth = new Date(currentCalYear, currentCalMonth + 1, 0).getDate();
    const today = new Date();
    
    let totalCells = 0;

    // Empty slots at the beginning
    for (let i = 0; i < firstDay; i++) {
        const el = document.createElement('div');
        grid.appendChild(el);
        totalCells++;
    }

    // Day slots
    for (let day = 1; day <= daysInMonth; day++) {
        const cell = document.createElement('button');
        cell.type = 'button';
        cell.className = 'calendar-day relative h-10 w-full rounded-xl flex items-center justify-center font-headline text-sm font-bold transition-all cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-primary/50';
        
        const dateString = `${currentCalYear}-${String(currentCalMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        
        // Checks
        const isToday = day === today.getDate() && currentCalMonth === today.getMonth() && currentCalYear === today.getFullYear();
        const isSelected = dateString === selectedDate;
        
        if (isSelected) {
            cell.classList.add('bg-primary', 'text-white', 'shadow-md');
            cell.classList.remove('hover:bg-zinc-100', 'dark:hover:bg-zinc-800');
        } else if (isToday) {
            cell.classList.add('text-primary', 'dark:text-red-400', 'bg-primary/5', 'dark:bg-red-900/20');
        } else {
            cell.classList.add('text-zinc-700', 'dark:text-zinc-300');
        }

        cell.textContent = day;
        
        // Get events for this day
        const dayEvents = eventsCache.filter(ev => ev.visit_date === dateString);
        
        if (dayEvents.length > 0) {
            const dotsContainer = document.createElement('div');
            dotsContainer.className = 'absolute bottom-1.5 left-1/2 -translate-x-1/2 flex gap-0.5';
            
            // Limit to 3 dots
            const dotsToShow = Math.min(dayEvents.length, 3);
            for (let i = 0; i < dotsToShow; i++) {
                const dot = document.createElement('div');
                dot.className = `w-1 h-1 rounded-full ${isSelected ? 'bg-white/80' : 'bg-primary dark:bg-red-400'}`;
                dotsContainer.appendChild(dot);
            }
            if(dayEvents.length > 3) {
                 const plus = document.createElement('span');
                 plus.className = `text-[8px] font-black leading-none ${isSelected ? 'text-white' : 'text-primary'}`;
                 plus.textContent = '+';
                 dotsContainer.appendChild(plus);
            }
            cell.appendChild(dotsContainer);
        }

        cell.onclick = () => {
            if (selectedDate === dateString) {
                // Deselect if already selected
                selectedDate = null;
            } else {
                selectedDate = dateString;
            }
            renderCalendarGrid();
            renderEventList();
        };

        grid.appendChild(cell);
        totalCells++;
    }

    // Fill remaining slots to maintain height (6 rows * 7 days = 42 cells max)
    const totalRows = Math.ceil(totalCells / 7);
    const remainingCells = (totalRows * 7) - totalCells;

    for (let i = 0; i < remainingCells; i++) {
        const el = document.createElement('div');
        grid.appendChild(el);
    }
    
    renderMonthPickerGrid();
}

function renderEventList() {
    const listContainer = document.getElementById('broker-list-visits');
    if (!listContainer) return;
    
    // Filter events based on selected date and current month
    let eventsToShow = eventsCache.filter(ev => {
        if (!ev.visit_date) return false;
        
        if (selectedDate) {
            return ev.visit_date === selectedDate;
        } else {
            // Show all events for the current month
            const [y, m] = ev.visit_date.split('-');
            return parseInt(y) === currentCalYear && parseInt(m) - 1 === currentCalMonth;
        }
    });

    if (eventsToShow.length === 0) {
        listContainer.innerHTML = `
            <div class="text-center py-6 text-sm text-zinc-500 font-medium bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl border border-zinc-100 dark:border-zinc-800">
                No hay eventos ${selectedDate ? 'para este día' : 'programados en este mes'}.
            </div>
        `;
        return;
    }

    // Sort by date and time
    eventsToShow.sort((a, b) => {
        const dtA = new Date(`${a.visit_date}T${a.visit_time || '00:00'}`);
        const dtB = new Date(`${b.visit_date}T${b.visit_time || '00:00'}`);
        return dtA - dtB;
    });

    listContainer.innerHTML = '';
    
    eventsToShow.forEach(ev => {
        const dateParts = ev.visit_date.split('-');
        const formatDate = `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}`;
        
        let icon = 'calendar_month';
        let colorClass = 'text-primary bg-primary/10';
        
        if (ev.type === 'firma') {
            icon = 'edit_document';
            colorClass = 'text-blue-600 bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400';
        } else if (ev.type === 'tasacion') {
            icon = 'real_estate_agent';
            colorClass = 'text-amber-600 bg-amber-100 dark:bg-amber-900/30 dark:text-amber-400';
        } else if (ev.type === 'entrega') {
            icon = 'key';
            colorClass = 'text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400';
        }
        
        const card = document.createElement('div');
        card.className = 'flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-zinc-50 dark:bg-zinc-800/80 hover:bg-zinc-100 dark:hover:bg-zinc-700/80 rounded-2xl border border-zinc-200 dark:border-zinc-700 transition-colors cursor-pointer group';
        card.innerHTML = `
            <div class="flex items-start gap-4">
                <div class="w-10 h-10 rounded-xl ${colorClass} flex items-center justify-center shrink-0">
                    <span class="material-symbols-outlined text-xl">${icon}</span>
                </div>
                <div>
                    <h4 class="font-headline font-bold text-sm text-zinc-900 dark:text-white group-hover:text-primary transition-colors">${ev.typeLabel}</h4>
                    <p class="text-xs text-zinc-500 line-clamp-1">${ev.property_title}</p>
                    <div class="flex items-center gap-3 mt-1.5">
                        <span class="flex items-center gap-1 text-[11px] font-medium text-zinc-600 dark:text-zinc-400">
                            <span class="material-symbols-outlined text-[14px]">event</span>
                            ${formatDate}
                        </span>
                        <span class="flex items-center gap-1 text-[11px] font-medium text-zinc-600 dark:text-zinc-400">
                            <span class="material-symbols-outlined text-[14px]">schedule</span>
                            ${ev.visit_time || '--:--'}
                        </span>
                    </div>
                </div>
            </div>
            
            <div class="flex items-center gap-3 pl-[56px] sm:pl-0">
                <div class="text-left sm:text-right">
                    <span class="block text-xs font-bold text-zinc-700 dark:text-zinc-300">${ev.visitor_name}</span>
                    <span class="block text-[10px] text-zinc-500">${ev.visitor_phone || ev.visitor_email || 'Sin contacto'}</span>
                </div>
            </div>
        `;
        listContainer.appendChild(card);
    });
}

function renderMonthPickerGrid() {
    const pickerGrid = document.getElementById('picker-month-grid');
    if (!pickerGrid) return;
    
    const monthNames = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
    pickerGrid.innerHTML = '';
    
    monthNames.forEach((month, index) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'py-2 rounded-xl text-xs font-black transition-colors cursor-pointer';
        
        if (index === currentCalMonth) {
            btn.classList.add('bg-primary', 'text-white');
        } else {
            btn.classList.add('text-zinc-600', 'dark:text-zinc-300', 'hover:bg-zinc-100', 'dark:hover:bg-zinc-800');
        }
        
        btn.textContent = month;
        btn.onclick = (e) => {
            e.stopPropagation();
            currentCalMonth = index;
            // Clear selected date when navigating months
            selectedDate = null;
            toggleMonthPickerPopover();
            renderCalendarGrid();
            renderEventList();
        };
        pickerGrid.appendChild(btn);
    });
}

window.navigateCalendarMonth = function(delta) {
    currentCalMonth += delta;
    if (currentCalMonth < 0) {
        currentCalMonth = 11;
        currentCalYear--;
    } else if (currentCalMonth > 11) {
        currentCalMonth = 0;
        currentCalYear++;
    }
    // Clear selected date when navigating months
    selectedDate = null;
    renderCalendarGrid();
    renderEventList();
};

window.toggleMonthPickerPopover = function(e) {
    if (e) e.stopPropagation();
    const popover = document.getElementById('calendar-month-picker-popover');
    if (popover) {
        popover.classList.toggle('hidden');
    }
};

window.changePickerYear = function(delta) {
    currentCalYear += delta;
    const pickerYearLabel = document.getElementById('picker-year-title');
    if (pickerYearLabel) pickerYearLabel.textContent = currentCalYear;
    renderMonthPickerGrid();
    renderCalendarGrid();
    renderEventList();
};

// Close popover when clicking outside
document.addEventListener('click', (e) => {
    const popover = document.getElementById('calendar-month-picker-popover');
    const toggleBtn = document.querySelector('[onclick="toggleMonthPickerPopover(event)"]');
    
    if (popover && !popover.classList.contains('hidden')) {
        // If click is outside popover and outside the toggle button
        if (!popover.contains(e.target) && (!toggleBtn || !toggleBtn.contains(e.target))) {
            popover.classList.add('hidden');
        }
    }
});
