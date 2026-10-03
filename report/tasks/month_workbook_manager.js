/**
 * Process Development Monthly Report Automation System
 * Module: Month Workbook Manager
 * Manages Month-Wise Input Sheets (JAN-2026 through DEC-2027)
 * Implements: Engineer | Task Name | Details/Steps | Category | Points | Immutable Task IDs
 * Matches: 'Process Task management entry 2025_2026.xlsx'
 * WALTON Hi-Tech Industries PLC
 */

class MonthWorkbookManager {
  constructor(storageKey = "walton_pd_month_workbooks_v2") {
    this.storageKey = storageKey;
    this.workbooks = {}; // Map of month -> Array of task rows
    this.activeMonth = "SEP-2026";
    this.init();
  }

  init() {
    try {
      let saved = localStorage.getItem(this.storageKey);
      if (!saved && this.storageKey === "walton_pd_month_workbooks_v2") {
        saved = localStorage.getItem("walton_pd_month_workbooks_v1");
      }
      if (saved) {
        this.workbooks = JSON.parse(saved);
      }
    } catch (e) {
      console.warn("Could not load workbooks from localStorage:", e);
    }

    // Sanitize any malformed month keys loaded from storage
    this.sanitizeWorkbooks();

    // Enforce 2-month retention policy immediately: Purge Jan-Jul and any month older than previous month
    this.enforceTwoMonthRetention();

    // Load full 2026 Production Dataset (Aug 2026 only, Jan-Jul purged)
    this.hydrateFromImported2026Dataset();

    // Re-enforce retention after hydration to ensure Jan-Jul never persists
    this.enforceTwoMonthRetention();

    // Clean up invalid or empty placeholder tasks only
    if (this.workbooks["SEP-2026"] && Array.isArray(this.workbooks["SEP-2026"])) {
      const initialCount = this.workbooks["SEP-2026"].length;
      this.workbooks["SEP-2026"] = this.workbooks["SEP-2026"].filter(t => {
        if (!t || !t.task_name || !t.task_name.trim() || t.task_name === 'Enter Task Name...') return false;
        return true;
      });
      if (this.workbooks["SEP-2026"].length !== initialCount) {
        this.save();
      }
    }

    // Isolate Project & Cost Saving tasks strictly from Monthly Input task tables (Requirement 1 & 2)
    // Never allow projects or cost savings to pollute monthly task management sheets
    Object.keys(this.workbooks).forEach(m => {
      if (Array.isArray(this.workbooks[m])) {
        const kept = [];
        this.workbooks[m].forEach(t => {
          if (!t) return;
          const tid = String(t.task_id || '').toUpperCase();
          const cat = String(t.category || '').toLowerCase();
          const isProj = Boolean(t.is_project || tid.startsWith('PROJ-') || cat.includes('ongoing project') || cat.includes('completed project') || cat.includes('strategic project'));
          const isCost = Boolean(t.is_cost_saving || tid.startsWith('CS-') || cat.includes('cost saving'));
          
          if (isProj) {
            // Rescue any strategic project (e.g. RAC Assembly line relocation) into permanent strategic projects store
            try {
              if (typeof window !== 'undefined' && window.localStorage) {
                const raw = localStorage.getItem("walton_strategic_projects_permanent_v1");
                let list = raw ? JSON.parse(raw) : [];
                if (!Array.isArray(list)) list = [];
                if (!list.some(p => p.task_id === t.task_id || (p.task_name && p.task_name.trim().toLowerCase() === String(t.task_name || '').trim().toLowerCase()))) {
                  list.push({
                    task_id: t.task_id || `PROJ-2026-${Date.now().toString().slice(-4)}`,
                    task_name: t.task_name,
                    category: cat.includes('complete') ? "Completed Projects" : "Ongoing Projects",
                    status: cat.includes('complete') ? "Completed" : "Ongoing",
                    project_status: cat.includes('complete') ? "Completed" : "Ongoing",
                    deadline: t.deadline || "4-5 Months",
                    overview: t.overview || t.description || t.task_details || "",
                    description: t.overview || t.description || t.task_details || "",
                    task_details: t.task_details || "",
                    assignee: t.assignee || t.engineer || "Kamrul (44819)",
                    engineer: t.assignee || t.engineer || "Kamrul (44819)",
                    photo_1: t.photo_1 || t.photo || "",
                    photo: t.photo_1 || t.photo || "",
                    before_photo: t.before_photo || "",
                    is_project: true,
                    created_at: t.created_at || new Date().toISOString(),
                    last_updated: new Date().toISOString()
                  });
                  localStorage.setItem("walton_strategic_projects_permanent_v1", JSON.stringify(list));
                  if (typeof FirebaseSyncService !== 'undefined' && FirebaseSyncService.broadcastProjectUpdate) {
                    FirebaseSyncService.broadcastProjectUpdate(list);
                  }
                }
              }
            } catch(e) {}
            return; // Omit from monthly tasks!
          }

          if (isCost) {
            return; // Omit from monthly tasks!
          }

          kept.push(t);
        });
        this.workbooks[m] = kept;
      }
    });

    // SEP-2026 initialized if missing
    if (!this.workbooks["SEP-2026"] || !Array.isArray(this.workbooks["SEP-2026"])) {
      this.workbooks["SEP-2026"] = [];
    }
    const currentSep = this.workbooks["SEP-2026"];
    const currentSepIds = new Set(currentSep.map(t => t && t.task_id));
    const defaultSep = this.getDefaultSep2026Tasks();
    let defaultAdded = false;
    defaultSep.forEach(dt => {
      if (dt && dt.task_id && !currentSepIds.has(dt.task_id)) {
        currentSep.push(JSON.parse(JSON.stringify(dt)));
        defaultAdded = true;
      }
    });
    this.workbooks["SEP-2026"] = currentSep;
    if (defaultAdded) {
      this.save();
    }
  }

  getDefaultSep2026Tasks() {
    return [
    {
        "_lastFieldEditTime": 1790595225943,
        "_lastPhotoEditTime": 1790654845094,
        "_syncedToCloud": true,
        "after_photo": "",
        "assignee": "Sazzad (50463)",
        "before_photo": "",
        "category": "Process development",
        "created_at": "2026-09-28T11:19:34.565Z",
        "deadline": "",
        "engineer": "Sazzad (50463)",
        "hod_point_locked": true,
        "include_in_report": "YES",
        "is_project": false,
        "last_updated": "2026-09-29T04:07:25.094Z",
        "month": "SEP-2026",
        "photo_1": "",
        "photo_2": "",
        "points": 300,
        "project_status": "",
        "remarks": "TMS_ID:105010",
        "status": "TMS#105010 (100% Completed)",
        "supervisor": "Kamrul (44819)",
        "task_details": "• Concept layout feasibility study • Structural fabrication component assembly • Control programming safety interlock • Pilot trial cycle optimization • Final commissioning operational SOP",
        "task_id": "SEP-2026-142-FJTG",
        "task_name": "Development of Task management System Automation",
        "tms_status": "100% Completed",
        "tms_synced_at": "2026-09-28T11:33:45.932Z",
        "tms_task_id": "105010",
        "tms_url": "http://192.168.118.138/adm/repo1/mod/tms/index.php?m=task&&page=single_task2&a=view&&code=105010",
        "updated_at": "2026-09-28T11:33:45.943Z"
    },
    {
        "_lastFieldEditTime": 1790595249924,
        "_lastPhotoEditTime": 1790654845103,
        "_syncedToCloud": true,
        "after_photo": "",
        "assignee": "Sazzad (50463)",
        "before_photo": "",
        "category": "Process development",
        "created_at": "2026-09-28T11:19:34.565Z",
        "deadline": "",
        "engineer": "Sazzad (50463)",
        "hod_point_locked": true,
        "include_in_report": "YES",
        "is_project": false,
        "last_updated": "2026-09-29T04:07:25.103Z",
        "month": "SEP-2026",
        "photo_1": "",
        "photo_2": "",
        "points": 200,
        "project_status": "",
        "remarks": "TMS_ID:105011",
        "status": "TMS#105011 (100% Completed)",
        "supervisor": "Kamrul (44819)",
        "task_details": "• Concept layout feasibility study • Structural fabrication component assembly • Control programming safety interlock • Pilot trial cycle optimization • Final commissioning operational SOP",
        "task_id": "SEP-2026-143-IUSP",
        "task_name": "Development of SOP making system",
        "tms_status": "100% Completed",
        "tms_synced_at": "2026-09-28T11:34:09.914Z",
        "tms_task_id": "105011",
        "tms_url": "http://192.168.118.138/adm/repo1/mod/tms/index.php?m=task&&page=single_task2&a=view&&code=105011",
        "updated_at": "2026-09-28T11:34:09.924Z"
    },
    {
        "_lastFieldEditTime": 1790595263611,
        "_lastPhotoEditTime": 1790654845112,
        "_syncedToCloud": true,
        "after_photo": "",
        "assignee": "Sazzad (50463)",
        "before_photo": "",
        "category": "Process development",
        "created_at": "2026-09-28T11:19:34.565Z",
        "deadline": "",
        "engineer": "Sazzad (50463)",
        "hod_point_locked": true,
        "include_in_report": "YES",
        "is_project": false,
        "last_updated": "2026-09-29T04:07:25.112Z",
        "month": "SEP-2026",
        "photo_1": "",
        "photo_2": "",
        "points": 60,
        "project_status": "",
        "remarks": "TMS_ID:105012",
        "status": "TMS#105012 (100% Completed)",
        "supervisor": "Kamrul (44819)",
        "task_details": "• Concept layout feasibility study • Structural fabrication component assembly • Control programming safety interlock • Pilot trial cycle optimization • Final commissioning operational SOP",
        "task_id": "SEP-2026-144-FSAF",
        "task_name": "Nepal SKD project Equipment list Report",
        "tms_status": "100% Completed",
        "tms_synced_at": "2026-09-28T11:34:23.606Z",
        "tms_task_id": "105012",
        "tms_url": "http://192.168.118.138/adm/repo1/mod/tms/index.php?m=task&&page=single_task2&a=view&&code=105012",
        "updated_at": "2026-09-28T11:34:23.611Z"
    },
    {
        "_lastFieldEditTime": 1790595275906,
        "_lastPhotoEditTime": 1790654845120,
        "_syncedToCloud": true,
        "after_photo": "",
        "assignee": "Sazzad (50463)",
        "before_photo": "",
        "category": "Process development",
        "created_at": "2026-09-28T11:19:34.565Z",
        "deadline": "",
        "engineer": "Sazzad (50463)",
        "hod_point_locked": true,
        "include_in_report": "YES",
        "is_project": false,
        "last_updated": "2026-09-29T04:07:25.120Z",
        "month": "SEP-2026",
        "photo_1": "",
        "photo_2": "",
        "points": 80,
        "project_status": "",
        "remarks": "TMS_ID:105013",
        "status": "TMS#105013 (100% Completed)",
        "supervisor": "Kamrul (44819)",
        "task_details": "• Dimension calculation CAD modeling • Cutter blade fixture fabrication • Pneumatic mounting sensor calibration • High-speed burr inspection trial • Line efficiency SOP handover",
        "task_id": "SEP-2026-145-Y4FB",
        "task_name": "Development of Foil cutting Table for Compressor Jacket to reduce cutting time",
        "tms_status": "100% Completed",
        "tms_synced_at": "2026-09-28T11:34:35.893Z",
        "tms_task_id": "105013",
        "tms_url": "http://192.168.118.138/adm/repo1/mod/tms/index.php?m=task&&page=single_task2&a=view&&code=105013",
        "updated_at": "2026-09-28T11:34:35.906Z"
    },
    {
        "_lastFieldEditTime": 1790595284627,
        "_lastPhotoEditTime": 1790654845130,
        "_syncedToCloud": true,
        "after_photo": "",
        "assignee": "Sazzad (50463)",
        "before_photo": "",
        "category": "Process development",
        "created_at": "2026-09-28T11:19:34.565Z",
        "deadline": "",
        "engineer": "Sazzad (50463)",
        "hod_point_locked": true,
        "include_in_report": "YES",
        "is_project": false,
        "last_updated": "2026-09-29T04:07:25.130Z",
        "month": "SEP-2026",
        "photo_1": "",
        "photo_2": "",
        "points": 80,
        "project_status": "",
        "remarks": "TMS_ID:105014",
        "status": "TMS#105014 (100% Completed)",
        "supervisor": "Kamrul (44819)",
        "task_details": "• P&ID pipe routing layout • Piping fabrication pressure testing • Gauge calibration booster sequencing • Line vacuum drawdown trial • Handover with integrity SOP",
        "task_id": "SEP-2026-146-N2WQ",
        "task_name": "Vacuum time reduction in 4 station to observe production working related issue",
        "tms_status": "100% Completed",
        "tms_synced_at": "2026-09-28T11:34:44.623Z",
        "tms_task_id": "105014",
        "tms_url": "http://192.168.118.138/adm/repo1/mod/tms/index.php?m=task&&page=single_task2&a=view&&code=105014",
        "updated_at": "2026-09-28T11:34:44.627Z"
    },
    {
        "_lastFieldEditTime": 1790595290160,
        "_lastPhotoEditTime": 1790654845138,
        "_syncedToCloud": true,
        "after_photo": "",
        "assignee": "Sazzad (50463)",
        "before_photo": "",
        "category": "Process development",
        "created_at": "2026-09-28T11:19:34.565Z",
        "deadline": "",
        "engineer": "Sazzad (50463)",
        "hod_point_locked": true,
        "include_in_report": "YES",
        "is_project": false,
        "last_updated": "2026-09-29T04:07:25.138Z",
        "month": "SEP-2026",
        "photo_1": "",
        "photo_2": "",
        "points": 60,
        "project_status": "",
        "remarks": "TMS_ID:105015",
        "status": "TMS#105015 (100% Completed)",
        "supervisor": "Kamrul (44819)",
        "task_details": "• Concept layout feasibility study • Structural fabrication component assembly • Control programming safety interlock • Pilot trial cycle optimization • Final commissioning operational SOP",
        "task_id": "SEP-2026-147-L7GA",
        "task_name": "Co-ordination to manage Roller conveyor from R&I and Handover to rework zone in production line",
        "tms_status": "100% Completed",
        "tms_synced_at": "2026-09-28T11:34:50.156Z",
        "tms_task_id": "105015",
        "tms_url": "http://192.168.118.138/adm/repo1/mod/tms/index.php?m=task&&page=single_task2&a=view&&code=105015",
        "updated_at": "2026-09-28T11:34:50.160Z"
    },
    {
        "_lastFieldEditTime": 1790595301992,
        "_lastPhotoEditTime": 1790654845145,
        "_syncedToCloud": true,
        "after_photo": "",
        "assignee": "Sazzad (50463)",
        "before_photo": "",
        "category": "Process development",
        "created_at": "2026-09-28T11:19:34.565Z",
        "deadline": "",
        "engineer": "Sazzad (50463)",
        "hod_point_locked": true,
        "include_in_report": "YES",
        "is_project": false,
        "last_updated": "2026-09-29T04:07:25.145Z",
        "month": "SEP-2026",
        "photo_1": "",
        "photo_2": "",
        "points": 60,
        "project_status": "",
        "remarks": "TMS_ID:105016",
        "status": "TMS#105016 (100% Completed)",
        "supervisor": "Kamrul (44819)",
        "task_details": "• Dimension calculation CAD modeling • Cutter blade fixture fabrication • Pneumatic mounting sensor calibration • High-speed burr inspection trial • Line efficiency SOP handover",
        "task_id": "SEP-2026-148-JTPO",
        "task_name": "24M0610 Compressor jacket Die Development with new modified design",
        "tms_status": "100% Completed",
        "tms_synced_at": "2026-09-28T11:35:01.988Z",
        "tms_task_id": "105016",
        "tms_url": "http://192.168.118.138/adm/repo1/mod/tms/index.php?m=task&&page=single_task2&a=view&&code=105016",
        "updated_at": "2026-09-28T11:35:01.992Z"
    },
    {
        "_lastFieldEditTime": 1790595306827,
        "_lastPhotoEditTime": 1790654845154,
        "_syncedToCloud": true,
        "after_photo": "",
        "assignee": "Sazzad (50463)",
        "before_photo": "",
        "category": "Process development",
        "created_at": "2026-09-28T11:19:34.565Z",
        "deadline": "",
        "engineer": "Sazzad (50463)",
        "hod_point_locked": true,
        "include_in_report": "YES",
        "is_project": false,
        "last_updated": "2026-09-29T04:07:25.154Z",
        "month": "SEP-2026",
        "photo_1": "",
        "photo_2": "",
        "points": 60,
        "project_status": "",
        "remarks": "TMS_ID:105017",
        "status": "TMS#105017 (100% Completed)",
        "supervisor": "Kamrul (44819)",
        "task_details": "• Dimension calculation CAD modeling • Cutter blade fixture fabrication • Pneumatic mounting sensor calibration • High-speed burr inspection trial • Line efficiency SOP handover",
        "task_id": "SEP-2026-149-SORS",
        "task_name": "24M1116 Compressor jacket Die Development with new modified design",
        "tms_status": "100% Completed",
        "tms_synced_at": "2026-09-28T11:35:06.821Z",
        "tms_task_id": "105017",
        "tms_url": "http://192.168.118.138/adm/repo1/mod/tms/index.php?m=task&&page=single_task2&a=view&&code=105017",
        "updated_at": "2026-09-28T11:35:06.827Z"
    },
    {
        "_lastFieldEditTime": 1790595311621,
        "_lastPhotoEditTime": 1790654845162,
        "_syncedToCloud": true,
        "after_photo": "",
        "assignee": "Sazzad (50463)",
        "before_photo": "",
        "category": "Process development",
        "created_at": "2026-09-28T11:19:34.565Z",
        "deadline": "",
        "engineer": "Sazzad (50463)",
        "hod_point_locked": true,
        "include_in_report": "YES",
        "is_project": false,
        "last_updated": "2026-09-29T04:07:25.162Z",
        "month": "SEP-2026",
        "photo_1": "",
        "photo_2": "",
        "points": 60,
        "project_status": "",
        "remarks": "TMS_ID:105018",
        "status": "TMS#105018 (100% Completed)",
        "supervisor": "Kamrul (44819)",
        "task_details": "• Dimension calculation CAD modeling • Cutter blade fixture fabrication • Pneumatic mounting sensor calibration • High-speed burr inspection trial • Line efficiency SOP handover",
        "task_id": "SEP-2026-150-M8CG",
        "task_name": "18H2122 Compressor jacket Die Development with new modified design",
        "tms_status": "100% Completed",
        "tms_synced_at": "2026-09-28T11:35:11.616Z",
        "tms_task_id": "105018",
        "tms_url": "http://192.168.118.138/adm/repo1/mod/tms/index.php?m=task&&page=single_task2&a=view&&code=105018",
        "updated_at": "2026-09-28T11:35:11.621Z"
    },
    {
        "_lastFieldEditTime": 1790595316428,
        "_lastPhotoEditTime": 1790654845171,
        "_syncedToCloud": true,
        "after_photo": "",
        "assignee": "Sazzad (50463)",
        "before_photo": "",
        "category": "Process development",
        "created_at": "2026-09-28T11:19:34.565Z",
        "deadline": "",
        "engineer": "Sazzad (50463)",
        "hod_point_locked": true,
        "include_in_report": "YES",
        "is_project": false,
        "last_updated": "2026-09-29T04:07:25.171Z",
        "month": "SEP-2026",
        "photo_1": "",
        "photo_2": "",
        "points": 60,
        "project_status": "",
        "remarks": "TMS_ID:105019",
        "status": "TMS#105019 (100% Completed)",
        "supervisor": "Kamrul (44819)",
        "task_details": "• Dimension calculation CAD modeling • Cutter blade fixture fabrication • Pneumatic mounting sensor calibration • High-speed burr inspection trial • Line efficiency SOP handover",
        "task_id": "SEP-2026-151-YQBW",
        "task_name": "Tube touch issue resolved for the 18M model by modifying the compressor jacket fitting.",
        "tms_status": "100% Completed",
        "tms_synced_at": "2026-09-28T11:35:16.424Z",
        "tms_task_id": "105019",
        "tms_url": "http://192.168.118.138/adm/repo1/mod/tms/index.php?m=task&&page=single_task2&a=view&&code=105019",
        "updated_at": "2026-09-28T11:35:16.428Z"
    },
    {
        "_lastFieldEditTime": 1790595329036,
        "_lastPhotoEditTime": 1790654845181,
        "_syncedToCloud": true,
        "after_photo": "",
        "assignee": "Sazzad (50463)",
        "before_photo": "",
        "category": "Process development",
        "created_at": "2026-09-28T11:19:34.565Z",
        "deadline": "",
        "engineer": "Sazzad (50463)",
        "hod_point_locked": true,
        "include_in_report": "YES",
        "is_project": false,
        "last_updated": "2026-09-29T04:07:25.181Z",
        "month": "SEP-2026",
        "photo_1": "",
        "photo_2": "",
        "points": 60,
        "project_status": "",
        "remarks": "TMS_ID:105020",
        "status": "TMS#105020 (100% Completed)",
        "supervisor": "Kamrul (44819)",
        "task_details": "• Dimension calculation CAD modeling • Cutter blade fixture fabrication • Pneumatic mounting sensor calibration • High-speed burr inspection trial • Line efficiency SOP handover",
        "task_id": "SEP-2026-152-9DLZ",
        "task_name": "Foil cutting system developed for 12J and 18M",
        "tms_status": "100% Completed",
        "tms_synced_at": "2026-09-28T11:35:29.025Z",
        "tms_task_id": "105020",
        "tms_url": "http://192.168.118.138/adm/repo1/mod/tms/index.php?m=task&&page=single_task2&a=view&&code=105020",
        "updated_at": "2026-09-28T11:35:29.036Z"
    },
    {
        "_lastFieldEditTime": 1790595334032,
        "_lastPhotoEditTime": 1790654845187,
        "_syncedToCloud": true,
        "after_photo": "",
        "assignee": "Sazzad (50463)",
        "before_photo": "",
        "category": "Process development",
        "created_at": "2026-09-28T11:19:34.565Z",
        "deadline": "",
        "engineer": "Sazzad (50463)",
        "hod_point_locked": true,
        "include_in_report": "YES",
        "is_project": false,
        "last_updated": "2026-09-29T04:07:25.187Z",
        "month": "SEP-2026",
        "photo_1": "",
        "photo_2": "",
        "points": 60,
        "project_status": "",
        "remarks": "TMS_ID:105021",
        "status": "TMS#105021 (100% Completed)",
        "supervisor": "Kamrul (44819)",
        "task_details": "• Concept layout feasibility study • Structural fabrication component assembly • Control programming safety interlock • Pilot trial cycle optimization • Final commissioning operational SOP",
        "task_id": "SEP-2026-153-82EE",
        "task_name": "24H Backnet forma modification to solve bend issue",
        "tms_status": "100% Completed",
        "tms_synced_at": "2026-09-28T11:35:34.029Z",
        "tms_task_id": "105021",
        "tms_url": "http://192.168.118.138/adm/repo1/mod/tms/index.php?m=task&&page=single_task2&a=view&&code=105021",
        "updated_at": "2026-09-28T11:35:34.032Z"
    },
    {
        "_lastFieldEditTime": 1790595344019,
        "_lastPhotoEditTime": 1790654845196,
        "_syncedToCloud": true,
        "after_photo": "",
        "assignee": "Sazzad (50463)",
        "before_photo": "",
        "category": "Process development",
        "created_at": "2026-09-28T11:19:34.565Z",
        "deadline": "",
        "engineer": "Sazzad (50463)",
        "hod_point_locked": true,
        "include_in_report": "YES",
        "is_project": false,
        "last_updated": "2026-09-29T04:07:25.196Z",
        "month": "SEP-2026",
        "photo_1": "",
        "photo_2": "",
        "points": 60,
        "project_status": "",
        "remarks": "TMS_ID:105022",
        "status": "TMS#105022 (100% Completed)",
        "supervisor": "Kamrul (44819)",
        "task_details": "• 3D fixture CAD modeling • Tooling CNC precision machining • Pneumatic clamp pressure testing • Dimensional repeatability pilot run • Production handover calibration sheet",
        "task_id": "SEP-2026-154-Z2U6",
        "task_name": "Fixture Development for VRF Fan Motor Stand Holding",
        "tms_status": "100% Completed",
        "tms_synced_at": "2026-09-28T11:35:44.010Z",
        "tms_task_id": "105022",
        "tms_url": "http://192.168.118.138/adm/repo1/mod/tms/index.php?m=task&&page=single_task2&a=view&&code=105022",
        "updated_at": "2026-09-28T11:35:44.019Z"
    },
    {
        "_lastFieldEditTime": 1790595349550,
        "_lastPhotoEditTime": 1790654845204,
        "_syncedToCloud": true,
        "after_photo": "",
        "assignee": "Sazzad (50463)",
        "before_photo": "",
        "category": "Process development",
        "created_at": "2026-09-28T11:19:34.565Z",
        "deadline": "",
        "engineer": "Sazzad (50463)",
        "hod_point_locked": true,
        "include_in_report": "YES",
        "is_project": false,
        "last_updated": "2026-09-29T04:07:25.204Z",
        "month": "SEP-2026",
        "photo_1": "",
        "photo_2": "",
        "points": 80,
        "project_status": "",
        "remarks": "TMS_ID:105023",
        "status": "TMS#105023 (100% Completed)",
        "supervisor": "Kamrul (44819)",
        "task_details": "• Camera mounting optical lighting • Barcode decoding script integration • Conveyor sensor rejection testing • Scanning accuracy trial audit • Line handover operator training",
        "task_id": "SEP-2026-155-EPQ0",
        "task_name": "Mass production Implement for scanning Smart QR code in Production line",
        "tms_status": "100% Completed",
        "tms_synced_at": "2026-09-28T11:35:49.539Z",
        "tms_task_id": "105023",
        "tms_url": "http://192.168.118.138/adm/repo1/mod/tms/index.php?m=task&&page=single_task2&a=view&&code=105023",
        "updated_at": "2026-09-28T11:35:49.550Z"
    },
    {
        "_lastFieldEditTime": 1790595353073,
        "_lastPhotoEditTime": 1790654845213,
        "_syncedToCloud": true,
        "after_photo": "",
        "assignee": "Sazzad (50463)",
        "before_photo": "",
        "category": "Process development",
        "created_at": "2026-09-28T11:19:34.565Z",
        "deadline": "",
        "engineer": "Sazzad (50463)",
        "hod_point_locked": true,
        "include_in_report": "YES",
        "is_project": false,
        "last_updated": "2026-09-29T04:07:25.213Z",
        "month": "SEP-2026",
        "photo_1": "",
        "photo_2": "",
        "points": 80,
        "project_status": "",
        "remarks": "TMS_ID:105024",
        "status": "TMS#105024 (100% Completed)",
        "supervisor": "Kamrul (44819)",
        "task_details": "• Punch matrix CAD layout • CNC nesting G-code programming • Sample batch stamping trial • Tonnage safety curtain calibration • Production commissioning operator signoff",
        "task_id": "SEP-2026-156-AU13",
        "task_name": "Co-ordinate to solve RRR machine sensor high pressure issue",
        "tms_status": "100% Completed",
        "tms_synced_at": "2026-09-28T11:35:53.065Z",
        "tms_task_id": "105024",
        "tms_url": "http://192.168.118.138/adm/repo1/mod/tms/index.php?m=task&&page=single_task2&a=view&&code=105024",
        "updated_at": "2026-09-28T11:35:53.073Z"
    },
    {
        "_lastFieldEditTime": 1790595356795,
        "_lastPhotoEditTime": 1790654845222,
        "_syncedToCloud": true,
        "after_photo": "",
        "assignee": "Sazzad (50463)",
        "before_photo": "",
        "category": "Process development",
        "created_at": "2026-09-28T11:19:34.565Z",
        "deadline": "",
        "engineer": "Sazzad (50463)",
        "hod_point_locked": true,
        "include_in_report": "YES",
        "is_project": false,
        "last_updated": "2026-09-29T04:07:25.222Z",
        "month": "SEP-2026",
        "photo_1": "",
        "photo_2": "",
        "points": 60,
        "project_status": "",
        "remarks": "TMS_ID:105025",
        "status": "TMS#105025 (100% Completed)",
        "supervisor": "Kamrul (44819)",
        "task_details": "• Concept layout feasibility study • Structural fabrication component assembly • Control programming safety interlock • Pilot trial cycle optimization • Final commissioning operational SOP",
        "task_id": "SEP-2026-157-B1B0",
        "task_name": "BOM cylinder collection for machine calibration for CAC line",
        "tms_status": "100% Completed",
        "tms_synced_at": "2026-09-28T11:35:56.789Z",
        "tms_task_id": "105025",
        "tms_url": "http://192.168.118.138/adm/repo1/mod/tms/index.php?m=task&&page=single_task2&a=view&&code=105025",
        "updated_at": "2026-09-28T11:35:56.795Z"
    },
    {
        "_lastFieldEditTime": 1790595360482,
        "_lastPhotoEditTime": 1790654845234,
        "_syncedToCloud": true,
        "after_photo": "",
        "assignee": "Sazzad (50463)",
        "before_photo": "",
        "category": "Process development",
        "created_at": "2026-09-28T11:19:34.565Z",
        "deadline": "",
        "engineer": "Sazzad (50463)",
        "hod_point_locked": true,
        "include_in_report": "YES",
        "is_project": false,
        "last_updated": "2026-09-29T04:07:25.234Z",
        "month": "SEP-2026",
        "photo_1": "",
        "photo_2": "",
        "points": 60,
        "project_status": "",
        "remarks": "TMS_ID:105026",
        "status": "TMS#105026 (100% Completed)",
        "supervisor": "Kamrul (44819)",
        "task_details": "• Dimension calculation CAD modeling • Cutter blade fixture fabrication • Pneumatic mounting sensor calibration • High-speed burr inspection trial • Line efficiency SOP handover",
        "task_id": "SEP-2026-158-U38B",
        "task_name": "VRF Compressor driver gasket insulation cutting system developed on laser machine",
        "tms_status": "100% Completed",
        "tms_synced_at": "2026-09-28T11:36:00.470Z",
        "tms_task_id": "105026",
        "tms_url": "http://192.168.118.138/adm/repo1/mod/tms/index.php?m=task&&page=single_task2&a=view&&code=105026",
        "updated_at": "2026-09-28T11:36:00.482Z"
    },
    {
        "_lastFieldEditTime": 1790595367500,
        "_lastPhotoEditTime": 1790654845242,
        "_syncedToCloud": true,
        "after_photo": "",
        "assignee": "Sazzad (50463)",
        "before_photo": "",
        "category": "Process development",
        "created_at": "2026-09-28T11:19:34.565Z",
        "deadline": "",
        "engineer": "Sazzad (50463)",
        "hod_point_locked": true,
        "include_in_report": "YES",
        "is_project": false,
        "last_updated": "2026-09-29T04:07:25.242Z",
        "month": "SEP-2026",
        "photo_1": "",
        "photo_2": "",
        "points": 60,
        "project_status": "",
        "remarks": "TMS_ID:105027",
        "status": "TMS#105027 (100% Completed)",
        "supervisor": "Kamrul (44819)",
        "task_details": "• Workstation ergonomic CAD layout • Fixture fabrication airline setup • Sensor calibration cylinder testing • Production trial cycle audit • Operator training SOP handover",
        "task_id": "SEP-2026-159-GKBY",
        "task_name": "18M1530 Rubber material CNC cutting program setup, trial and handover to production",
        "tms_status": "100% Completed",
        "tms_synced_at": "2026-09-28T11:36:07.491Z",
        "tms_task_id": "105027",
        "tms_url": "http://192.168.118.138/adm/repo1/mod/tms/index.php?m=task&&page=single_task2&a=view&&code=105027",
        "updated_at": "2026-09-28T11:36:07.500Z"
    },
    {
        "_lastFieldEditTime": 1790595378130,
        "_lastPhotoEditTime": 1790654845250,
        "_syncedToCloud": true,
        "after_photo": "",
        "assignee": "Sazzad (50463)",
        "before_photo": "",
        "category": "Process development",
        "created_at": "2026-09-28T11:19:34.565Z",
        "deadline": "",
        "engineer": "Sazzad (50463)",
        "hod_point_locked": true,
        "include_in_report": "YES",
        "is_project": false,
        "last_updated": "2026-09-29T04:07:25.250Z",
        "month": "SEP-2026",
        "photo_1": "",
        "photo_2": "",
        "points": 60,
        "project_status": "",
        "remarks": "TMS_ID:105028",
        "status": "TMS#105028 (100% Completed)",
        "supervisor": "Kamrul (44819)",
        "task_details": "• Workstation ergonomic CAD layout • Fixture fabrication airline setup • Sensor calibration cylinder testing • Production trial cycle audit • Operator training SOP handover",
        "task_id": "SEP-2026-160-O9XW",
        "task_name": "24M1116 Rubber material CNC cutting program setup, trial and handover to production",
        "tms_status": "100% Completed",
        "tms_synced_at": "2026-09-28T11:36:18.126Z",
        "tms_task_id": "105028",
        "tms_url": "http://192.168.118.138/adm/repo1/mod/tms/index.php?m=task&&page=single_task2&a=view&&code=105028",
        "updated_at": "2026-09-28T11:36:18.130Z"
    },
    {
        "_lastFieldEditTime": 1790595381292,
        "_lastPhotoEditTime": 1790654845259,
        "_syncedToCloud": true,
        "after_photo": "",
        "assignee": "Sazzad (50463)",
        "before_photo": "",
        "category": "Process development",
        "created_at": "2026-09-28T11:19:34.565Z",
        "deadline": "",
        "engineer": "Sazzad (50463)",
        "hod_point_locked": true,
        "include_in_report": "YES",
        "is_project": false,
        "last_updated": "2026-09-29T04:07:25.259Z",
        "month": "SEP-2026",
        "photo_1": "",
        "photo_2": "",
        "points": 60,
        "project_status": "",
        "remarks": "TMS_ID:105029",
        "status": "TMS#105029 (100% Completed)",
        "supervisor": "Kamrul (44819)",
        "task_details": "• Workstation ergonomic CAD layout • Fixture fabrication airline setup • Sensor calibration cylinder testing • Production trial cycle audit • Operator training SOP handover",
        "task_id": "SEP-2026-161-CM3U",
        "task_name": "24H0610 Rubber material CNC cutting program setup, trial and handover to production",
        "tms_status": "100% Completed",
        "tms_synced_at": "2026-09-28T11:36:21.286Z",
        "tms_task_id": "105029",
        "tms_url": "http://192.168.118.138/adm/repo1/mod/tms/index.php?m=task&&page=single_task2&a=view&&code=105029",
        "updated_at": "2026-09-28T11:36:21.292Z"
    },
    {
        "_lastFieldEditTime": 1790595386167,
        "_lastPhotoEditTime": 1790654845268,
        "_syncedToCloud": true,
        "after_photo": "",
        "assignee": "Sazzad (50463)",
        "before_photo": "",
        "category": "Process development",
        "created_at": "2026-09-28T11:19:34.565Z",
        "deadline": "",
        "engineer": "Sazzad (50463)",
        "hod_point_locked": true,
        "include_in_report": "YES",
        "is_project": false,
        "last_updated": "2026-09-29T04:07:25.268Z",
        "month": "SEP-2026",
        "photo_1": "",
        "photo_2": "",
        "points": 60,
        "project_status": "",
        "remarks": "TMS_ID:105030",
        "status": "TMS#105030 (100% Completed)",
        "supervisor": "Kamrul (44819)",
        "task_details": "• Camera mounting optical lighting • Barcode decoding script integration • Conveyor sensor rejection testing • Scanning accuracy trial audit • Line handover operator training",
        "task_id": "SEP-2026-162-MR1M",
        "task_name": "SOP making for Smart QR code system in RAC Indoor line",
        "tms_status": "100% Completed",
        "tms_synced_at": "2026-09-28T11:36:26.160Z",
        "tms_task_id": "105030",
        "tms_url": "http://192.168.118.138/adm/repo1/mod/tms/index.php?m=task&&page=single_task2&a=view&&code=105030",
        "updated_at": "2026-09-28T11:36:26.167Z"
    },
    {
        "_lastFieldEditTime": 1790595391313,
        "_lastPhotoEditTime": 1790654845277,
        "_syncedToCloud": true,
        "after_photo": "",
        "assignee": "Sazzad (50463)",
        "before_photo": "",
        "category": "Process development",
        "created_at": "2026-09-28T11:19:34.565Z",
        "deadline": "",
        "engineer": "Sazzad (50463)",
        "hod_point_locked": true,
        "include_in_report": "YES",
        "is_project": false,
        "last_updated": "2026-09-29T04:07:25.277Z",
        "month": "SEP-2026",
        "photo_1": "",
        "photo_2": "",
        "points": 60,
        "project_status": "",
        "remarks": "TMS_ID:105031",
        "status": "TMS#105031 (100% Completed)",
        "supervisor": "Kamrul (44819)",
        "task_details": "• Punch matrix CAD layout • CNC nesting G-code programming • Sample batch stamping trial • Tonnage safety curtain calibration • Production commissioning operator signoff",
        "task_id": "SEP-2026-163-YGIQ",
        "task_name": "VRF Compressor Rubber Insulation collection from store and machine feasibility check for mass order",
        "tms_status": "100% Completed",
        "tms_synced_at": "2026-09-28T11:36:31.309Z",
        "tms_task_id": "105031",
        "tms_url": "http://192.168.118.138/adm/repo1/mod/tms/index.php?m=task&&page=single_task2&a=view&&code=105031",
        "updated_at": "2026-09-28T11:36:31.313Z"
    },
    {
        "_lastFieldEditTime": 1790595414469,
        "_lastPhotoEditTime": 1790654845286,
        "_syncedToCloud": true,
        "after_photo": "",
        "assignee": "Sazzad (50463)",
        "before_photo": "",
        "category": "Others",
        "created_at": "2026-09-28T11:19:34.565Z",
        "deadline": "",
        "engineer": "Sazzad (50463)",
        "hod_point_locked": true,
        "include_in_report": "YES",
        "is_project": false,
        "last_updated": "2026-09-29T04:07:25.286Z",
        "month": "SEP-2026",
        "photo_1": "",
        "photo_2": "",
        "points": 60,
        "project_status": "",
        "remarks": "TMS_ID:105034",
        "status": "TMS#105034 (100% Completed)",
        "supervisor": "Kamrul (44819)",
        "task_details": "• Workstation ergonomic CAD layout • Fixture fabrication airline setup • Sensor calibration cylinder testing • Production trial cycle audit • Operator training SOP handover",
        "task_id": "SEP-2026-164-IZE1",
        "task_name": "Gas Charging Program Setup for Sep Month Production unit",
        "tms_status": "100% Completed",
        "tms_synced_at": "2026-09-28T11:36:54.462Z",
        "tms_task_id": "105034",
        "tms_url": "http://192.168.118.138/adm/repo1/mod/tms/index.php?m=task&&page=single_task2&a=view&&code=105034",
        "updated_at": "2026-09-28T11:36:54.469Z"
    },
    {
        "_lastFieldEditTime": 1790595409229,
        "_lastPhotoEditTime": 1790654845294,
        "_syncedToCloud": true,
        "after_photo": "",
        "assignee": "Sazzad (50463)",
        "before_photo": "",
        "category": "Others",
        "created_at": "2026-09-28T11:19:34.565Z",
        "deadline": "",
        "engineer": "Sazzad (50463)",
        "hod_point_locked": true,
        "include_in_report": "YES",
        "is_project": false,
        "last_updated": "2026-09-29T04:07:25.294Z",
        "month": "SEP-2026",
        "photo_1": "",
        "photo_2": "",
        "points": 60,
        "project_status": "",
        "remarks": "TMS_ID:105033",
        "status": "TMS#105033 (100% Completed)",
        "supervisor": "Kamrul (44819)",
        "task_details": "• Workstation ergonomic CAD layout • Fixture fabrication airline setup • Sensor calibration cylinder testing • Production trial cycle audit • Operator training SOP handover",
        "task_id": "SEP-2026-165-B8QB",
        "task_name": "Ageing Program Setup for Sep Month Production unit",
        "tms_status": "100% Completed",
        "tms_synced_at": "2026-09-28T11:36:49.219Z",
        "tms_task_id": "105033",
        "tms_url": "http://192.168.118.138/adm/repo1/mod/tms/index.php?m=task&&page=single_task2&a=view&&code=105033",
        "updated_at": "2026-09-28T11:36:49.229Z"
    },
    {
        "_lastFieldEditTime": 1790595404570,
        "_lastPhotoEditTime": 1790654845304,
        "_syncedToCloud": true,
        "after_photo": "",
        "assignee": "Sazzad (50463)",
        "before_photo": "",
        "category": "Others",
        "created_at": "2026-09-28T11:19:34.565Z",
        "deadline": "",
        "engineer": "Sazzad (50463)",
        "hod_point_locked": true,
        "include_in_report": "YES",
        "is_project": false,
        "last_updated": "2026-09-29T04:07:25.304Z",
        "month": "SEP-2026",
        "photo_1": "",
        "photo_2": "",
        "points": 60,
        "project_status": "",
        "remarks": "TMS_ID:105032",
        "status": "TMS#105032 (100% Completed)",
        "supervisor": "Kamrul (44819)",
        "task_details": "• Workstation ergonomic CAD layout • Fixture fabrication airline setup • Sensor calibration cylinder testing • Production trial cycle audit • Operator training SOP handover",
        "task_id": "SEP-2026-166-EVWA",
        "task_name": "Electrical Component Mapping Setup for Sep Month Production unit",
        "tms_status": "100% Completed",
        "tms_synced_at": "2026-09-28T11:36:44.563Z",
        "tms_task_id": "105032",
        "tms_url": "http://192.168.118.138/adm/repo1/mod/tms/index.php?m=task&&page=single_task2&a=view&&code=105032",
        "updated_at": "2026-09-28T11:36:44.570Z"
    }
];
  }

  sanitizeWorkbooks() {
    if (!this.workbooks || typeof this.workbooks !== 'object') return;
    const keys = Object.keys(this.workbooks);
    let modified = false;

    // Load deleted task IDs without artificial immunity (excluding protected tasks)
    let deletedIds = [];
    try {
      deletedIds = JSON.parse(localStorage.getItem('walton_deleted_task_ids') || '[]');
    } catch (e) {}
    if (typeof SAZZAD_PROTECTED_TASK_IDS !== 'undefined') {
      deletedIds = deletedIds.filter(id => !SAZZAD_PROTECTED_TASK_IDS.has(id));
      try {
        localStorage.setItem('walton_deleted_task_ids', JSON.stringify(deletedIds));
      } catch (e) {}
    }
    const deletedSet = new Set(deletedIds);

    keys.forEach(k => {
      const norm = this.normalizeMonth(k);
      if (Array.isArray(this.workbooks[k])) {
        // Filter out tombstoned deleted tasks and blacklisted engineers (Mahmud 51020, etc.)
        this.workbooks[k] = this.workbooks[k].filter(t => {
          if (!t || !t.task_id) return false;
          if (deletedSet.has(t.task_id)) return false;
          const ass = String(t.assignee || t.engineer || '');
          if (typeof REMOVED_ENGINEER_IDS !== 'undefined') {
            for (const rId of REMOVED_ENGINEER_IDS) {
              if (ass.includes(rId)) return false;
            }
          }
          return true;
        });

        // Auto-deduplicate identical tasks for the same engineer in the same month, keeping the one with higher points
        const seenNames = new Map();
        const deduplicated = [];
        this.workbooks[k].forEach(t => {
          const key = (t.task_name || '').trim().toLowerCase() + ':::' + (t.assignee || '').trim().toLowerCase();
          if (!key.trim() || key === ':::') {
            deduplicated.push(t);
            return;
          }
          if (!seenNames.has(key)) {
            seenNames.set(key, t);
            deduplicated.push(t);
          } else {
            const existing = seenNames.get(key);
            const exPts = parseFloat(existing.points) || 0;
            const newPts = parseFloat(t.points) || 0;
            if (newPts > exPts) {
              const idx = deduplicated.indexOf(existing);
              if (idx !== -1) deduplicated[idx] = t;
              seenNames.set(key, t);
              deletedSet.add(existing.task_id);
            } else {
              deletedSet.add(t.task_id);
            }
            modified = true;
          }
        });
        this.workbooks[k] = deduplicated;

        this.workbooks[k].forEach(t => {
          if (!t) return;
          // Auto-repair mistakenly defaulted Sazzad supervisor to Kamrul (44819)
          if (t.supervisor) {
            const supLower = String(t.supervisor).toLowerCase();
            if (supLower.includes('sazzad') || supLower.includes('50463')) {
              t.supervisor = 'Kamrul (44819)';
              modified = true;
            }
          }
        });
      }

      if (norm !== k) {
        if (!this.workbooks[norm]) {
          this.workbooks[norm] = [];
        }
        const existingIds = new Set(this.workbooks[norm].map(t => t.task_id));
        const malformedTasks = this.workbooks[k] || [];
        malformedTasks.forEach(t => {
          t.month = norm;
          if (!existingIds.has(t.task_id) && !deletedSet.has(t.task_id)) {
            this.workbooks[norm].push(t);
            existingIds.add(t.task_id);
          }
        });
        delete this.workbooks[k];
        modified = true;
      }
    });

    if (modified) {
      this.save();
    }
  }

  hydrateFromImported2026Dataset(forceReload = false) {
    const dataset = (typeof IMPORTED_2026_DATASET !== 'undefined')
      ? IMPORTED_2026_DATASET
      : ((typeof window !== 'undefined' && window.IMPORTED_2026_DATASET) ? window.IMPORTED_2026_DATASET : null);

    if (!dataset) return false;

    const formatName = (n) => (typeof MasterDataManager !== 'undefined' && MasterDataManager.formatNameWithId)
      ? MasterDataManager.formatNameWithId(n)
      : (n || "").trim();

    const months = Object.keys(dataset);
    let loadedAny = false;

    months.forEach(m => {
      // Strictly protect running and active months from dataset overwrites
      if (m === "SEP-2026" || m.includes("2027") || m === this.activeMonth) return;
      const currentTasks = this.workbooks[m] || [];
      const incomingTasks = dataset[m] || [];

      // Upgrade if empty, forceReload, or has mismatched count
      if (forceReload || (currentTasks.length < 50 && incomingTasks.length > 0) || (currentTasks.length !== incomingTasks.length && incomingTasks.length > 0)) {
        this.workbooks[m] = incomingTasks.map(t => {
          const assignee = formatName(t.assignee || t.engineer);
          const supervisor = formatName(t.supervisor);
          return {
            task_id: t.task_id,
            month: m,
            task_name: t.task_name || "",
            task_details: t.task_details || "",
            category: t.category || "Process development",
            points: (t.points !== "" && t.points !== undefined && t.points !== null && !isNaN(parseFloat(t.points))) ? parseFloat(t.points) : "",
            supervisor: supervisor,
            assignee: assignee,
            engineer: assignee,
            start_date: t.start_date || "",
            end_date: t.end_date || "",
            status: t.status || "Task Entry Completed",
            include_in_report: t.include_in_report === "NO" ? "NO" : "YES",
            created_at: t.created_at || new Date().toISOString()
          };
        });
        loadedAny = true;
      }
    });

    if (loadedAny) {
      this.save();
    }
    return loadedAny;
  }

  save() {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.workbooks));
    } catch (e) {
      console.warn("Storage quota notice: keeping workbooks in memory:", e);
    }
  }

  normalizeMonth(month) {
    if (!month) return "SEP-2026";
    const str = String(month).trim();
    const upper = str.toUpperCase();

    // 1. Exact standard month code e.g. "SEP-2026", "JUN-2026"
    const std = upper.match(/^(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)[- ]?(\d{4})$/);
    if (std) {
      return `${std[1]}-${std[2]}`;
    }

    // 2. Exact ISO format e.g. "2026-06"
    if (/^\d{4}-\d{2}$/.test(str)) {
      const [year, mStr] = str.split("-");
      const monthNames = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
      const mIdx = parseInt(mStr, 10) - 1;
      return `${monthNames[mIdx] || "SEP"}-${year}`;
    }

    // 3. Exact full month name e.g. "September 2026", "September-2026"
    const fullMonths = {
      "JANUARY": "JAN", "FEBRUARY": "FEB", "MARCH": "MAR", "APRIL": "APR", "MAY": "MAY", "JUNE": "JUN",
      "JULY": "JUL", "AUGUST": "AUG", "SEPTEMBER": "SEP", "OCTOBER": "OCT", "NOVEMBER": "NOV", "DECEMBER": "DEC"
    };
    const fullMatch = upper.match(/^(JANUARY|FEBRUARY|MARCH|APRIL|MAY|JUNE|JULY|AUGUST|SEPTEMBER|OCTOBER|NOVEMBER|DECEMBER)[- ]?(\d{4})$/);
    if (fullMatch) {
      return `${fullMonths[fullMatch[1]]}-${fullMatch[2]}`;
    }

    // 4. Date object / locale date string from Google Sheets (e.g. "Tue Sep 01 2026 00:00:00 GMT+0600 (Bangladesh Standard Time)")
    const monthMap = {
      "JAN": "JAN", "FEB": "FEB", "MAR": "MAR", "APR": "APR", "MAY": "MAY", "JUN": "JUN",
      "JUL": "JUL", "AUG": "AUG", "SEP": "SEP", "OCT": "OCT", "NOV": "NOV", "DEC": "DEC",
      "JANUARY": "JAN", "FEBRUARY": "FEB", "MARCH": "MAR", "APRIL": "APR", "JUNE": "JUN",
      "JULY": "JUL", "AUGUST": "AUG", "SEPTEMBER": "SEP", "OCTOBER": "OCT", "NOVEMBER": "NOV", "DECEMBER": "DEC"
    };

    if (upper.includes("GMT") || upper.includes("UTC") || upper.includes("00:00:00") || /^(MON|TUE|WED|THU|FRI|SAT|SUN)\b/.test(upper)) {
      const mMatch = upper.match(/\b(JANUARY|FEBRUARY|MARCH|APRIL|MAY|JUNE|JULY|AUGUST|SEPTEMBER|OCTOBER|NOVEMBER|DECEMBER|JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)\b/);
      const yMatch = upper.match(/\b(202\d|203\d)\b/);
      if (mMatch && yMatch) {
        const code = monthMap[mMatch[1]] || mMatch[1].substring(0, 3);
        return `${code}-${yMatch[1]}`;
      }
    }

    // 5. Universal date fallback: If string has spaces, colons, or slashes and contains month name and 4-digit year
    if (upper.includes(" ") || upper.includes(":") || upper.includes("/")) {
      const anyM = upper.match(/\b(JANUARY|FEBRUARY|MARCH|APRIL|MAY|JUNE|JULY|AUGUST|SEPTEMBER|OCTOBER|NOVEMBER|DECEMBER|JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)\b/);
      const anyY = upper.match(/\b(202\d|203\d)\b/);
      if (anyM && anyY) {
        const code = monthMap[anyM[1]] || anyM[1].substring(0, 3);
        return `${code}-${anyY[1]}`;
      }
    }

    return upper;
  }

  calculatePreviousMonthCode(monthCode) {
    const norm = this.normalizeMonth(monthCode);
    const parts = norm.split("-");
    if (parts.length !== 2) return null;
    const monthNames = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
    const mIdx = monthNames.indexOf(parts[0].toUpperCase());
    let year = parseInt(parts[1], 10);
    if (mIdx === -1 || isNaN(year)) return null;

    if (mIdx === 0) {
      return `DEC-${year - 1}`;
    } else {
      return `${monthNames[mIdx - 1]}-${year}`;
    }
  }

  isMonthExpired(monthCode) {
    const norm = this.normalizeMonth(monthCode);
    const parts = norm.split('-');
    if (parts.length !== 2) return false;
    const mStr = parts[0];
    const yVal = parseInt(parts[1], 10);
    const monthNames = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
    const mIdx = monthNames.indexOf(mStr);
    if (mIdx === -1 || isNaN(yVal)) return false;

    // Purge Jan 2026 - Jul 2026 permanently
    if (yVal === 2026 && mIdx < 7) {
      return true;
    }

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonthIdx = now.getMonth(); // 9 = October
    const currentDay = now.getDate();

    // Specific rule for August 2026:
    // In October 2026, AUG-2026 tasks remain until October 10th.
    // Starting October 11th, AUG-2026 is expired and removed from the active system.
    if (norm === "AUG-2026") {
      if (currentYear > 2026) return true;
      if (currentYear === 2026) {
        if (currentMonthIdx > 9) return true; // November or later
        if (currentMonthIdx === 9) {
          // October 2026: expired if day is 11 or later
          return currentDay > 10;
        }
        return false; // September 2026 or earlier
      }
      return false;
    }

    // General rolling 2-month rule with 10-day grace period:
    const monthScore = yVal * 12 + mIdx;
    const currentScore = currentYear * 12 + currentMonthIdx;
    const diff = currentScore - monthScore;

    if (diff <= 1) return false; // Current month or previous month is always retained
    if (diff === 2) {
      // 2 months ago is kept until day 10 of current month
      return currentDay > 10;
    }
    return true; // 3 or more months ago is expired
  }

  enforceTwoMonthRetention(activeMonth = null) {
    let purgedAny = false;

    // Purge expired months from workbooks
    Object.keys(this.workbooks).forEach(k => {
      const norm = this.normalizeMonth(k);
      if (this.isMonthExpired(norm)) {
        delete this.workbooks[k];
        delete this.workbooks[norm];
        purgedAny = true;
      }
    });

    // Clean up older localStorage keys
    try {
      const obsoleteKeys = [
        "walton_pd_month_workbooks_v1",
        "walton_pd_tasks_JAN-2026", "walton_pd_tasks_FEB-2026", "walton_pd_tasks_MAR-2026",
        "walton_pd_tasks_APR-2026", "walton_pd_tasks_MAY-2026", "walton_pd_tasks_JUN-2026",
        "walton_pd_tasks_JUL-2026"
      ];
      if (this.isMonthExpired("AUG-2026")) {
        obsoleteKeys.push("walton_pd_tasks_AUG-2026");
        obsoleteKeys.push("walton_pd_active_slides_AUG-2026");
      }
      obsoleteKeys.forEach(key => localStorage.removeItem(key));
    } catch (e) {}

    if (purgedAny) {
      this.save();
    }
  }

  getAllMonths() {
    const list = [];
    if (!this.isMonthExpired("AUG-2026") && this.workbooks["AUG-2026"]) {
      list.push("AUG-2026");
    }
    if (this.workbooks["SEP-2026"]) {
      list.push("SEP-2026");
    }
    if (this.workbooks["OCT-2026"]) {
      list.push("OCT-2026");
    }
    Object.keys(this.workbooks).forEach(k => {
      const norm = this.normalizeMonth(k);
      if (!this.isMonthExpired(norm) && !list.includes(norm)) {
        list.push(norm);
      }
    });
    return list.length > 0 ? list : ["AUG-2026", "SEP-2026"];
  }

  createMonth(monthCode) {
    if (!monthCode || !monthCode.trim()) throw new Error("Month code required.");
    const m = this.normalizeMonth(monthCode);
    if (!this.workbooks[m]) {
      this.workbooks[m] = [];
      this.save();
    }
    return m;
  }

  getTasksForMonth(month) {
    const m = this.normalizeMonth(month);
    if (!this.workbooks[m]) {
      this.workbooks[m] = [];
    }
    // Strict Project & Cost Saving Isolation (Requirement 1 & 2)
    return this.workbooks[m].filter(t => {
      if (!t) return false;
      if (t.is_project === true || t.is_cost_saving === true) return false;
      const tid = String(t.task_id || '').toUpperCase();
      if (tid.startsWith('PROJ-') || tid.startsWith('CS-')) return false;
      const cat = String(t.category || '').toLowerCase();
      if (cat.includes('ongoing project') || cat.includes('completed project') || cat.includes('strategic project') || cat.includes('cost saving')) return false;
      return true;
    });
  }

  getTask(month, taskId) {
    const m = this.normalizeMonth(month);
    const tasks = this.workbooks[m] || [];
    return tasks.find(t => t.task_id === taskId) || null;
  }

  generateNextTaskId(month) {
    const m = this.normalizeMonth(month);
    const tasks = this.getTasksForMonth(m);
    let maxSeq = 0;
    const prefix = `${m}-`;
    tasks.forEach(t => {
      if (t.task_id && t.task_id.startsWith(prefix)) {
        const numPart = t.task_id.substring(prefix.length).split('-')[0];
        const num = parseInt(numPart, 10);
        if (!isNaN(num) && num > maxSeq) {
          maxSeq = num;
        }
      }
    });

    let deletedIds = new Set();
    try {
      const d = JSON.parse(localStorage.getItem('walton_deleted_task_ids') || '[]');
      d.forEach(id => deletedIds.add(id));
    } catch (e) {}

    let nextSeq = maxSeq + 1;
    let randSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
    let candidateId = `${prefix}${String(nextSeq).padStart(3, "0")}-${randSuffix}`;

    let attempts = 0;
    while ((deletedIds.has(candidateId) || tasks.some(t => t.task_id === candidateId)) && attempts < 500) {
      nextSeq++;
      attempts++;
      randSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
      candidateId = `${prefix}${String(nextSeq).padStart(3, "0")}-${randSuffix}`;
    }

    return candidateId;
  }

  addTask(month, engineerOrAssignee, taskName = "", includeInReport = "YES", taskDetails = "", category = "Process development", points = "", supervisor = "", options = {}) {
    const m = this.normalizeMonth(month);
    if (!this.workbooks[m]) {
      this.workbooks[m] = [];
    }

    if (!engineerOrAssignee || !engineerOrAssignee.trim()) {
      engineerOrAssignee = "Sazzad (50463)";
    }

    if (typeof taskDetails === 'object' && taskDetails !== null) {
      options = taskDetails;
      taskDetails = options.task_details || "";
      category = options.category || category;
      points = options.points !== undefined ? options.points : points;
      supervisor = options.supervisor || supervisor;
    }

    const taskId = this.generateNextTaskId(m);
    const parsedPts = (points !== "" && points !== undefined && points !== null && !isNaN(parseFloat(points))) ? parseFloat(points) : "";
    
    const formatName = (n) => (typeof MasterDataManager !== 'undefined' && MasterDataManager.formatNameWithId)
      ? MasterDataManager.formatNameWithId(n)
      : (n || "").trim();

    const cleanAssignee = formatName(engineerOrAssignee);
    const cleanSupervisor = formatName(supervisor || "Kamrul (44819)");

    const isProject = Boolean(options.is_project || category === 'Ongoing Projects' || category === 'Completed Projects');
    const projectStatus = options.project_status || (category === 'Completed Projects' ? 'Completed' : (isProject ? 'Ongoing' : ''));
    const deadline = options.deadline || "";

    const newTask = {
      task_id: taskId,
      month: m,
      assignee: cleanAssignee,
      engineer: cleanAssignee, // Kept for complete backwards compatibility
      supervisor: cleanSupervisor,
      task_name: taskName.trim(),
      task_details: (taskDetails || "").trim(),
      category: (category || "Process development").trim(),
      points: parsedPts, // Task Point (Actual Point)
      include_in_report: includeInReport === "NO" ? "NO" : "YES",
      status: "",
      remarks: "",
      photo_1: "",
      photo_2: "",
      is_project: isProject,
      project_status: projectStatus,
      deadline: deadline,
      _isLocalDraft: true,
      created_at: new Date().toISOString(),
      last_updated: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // Guarantee new task ID is never shadowed by previous tombstone
    try {
      let curDel = JSON.parse(localStorage.getItem('walton_deleted_task_ids') || '[]');
      if (curDel.includes(taskId)) {
        curDel = curDel.filter(id => id !== taskId);
        localStorage.setItem('walton_deleted_task_ids', JSON.stringify(curDel));
      }
    } catch (e) {}

    this.workbooks[m].push(newTask);
    this.save();
    if (typeof FirebaseSyncService !== 'undefined' && FirebaseSyncService.isConnected()) {
      FirebaseSyncService.pushTask(m, newTask);
    }
    if (typeof GoogleSheetsSync !== 'undefined' && GoogleSheetsSync.pushTask) {
      GoogleSheetsSync.pushTask(newTask).then(ok => {
        if (ok) {
          delete newTask._isLocalDraft;
          newTask._syncedToCloud = true;
          this.save();
        }
      }).catch(() => {});
    }
    return newTask;
  }

  /**
   * High-speed bulk insertion of multiple tasks into a month workbook
   * Saves to disk once and broadcasts in batch to avoid any UI lag
   */
  addTasksBatch(month, taskList = []) {
    const m = this.normalizeMonth(month);
    if (!this.workbooks[m]) {
      this.workbooks[m] = [];
    }
    if (!Array.isArray(taskList) || taskList.length === 0) return [];

    const formatName = (n) => (typeof MasterDataManager !== 'undefined' && MasterDataManager.formatNameWithId)
      ? MasterDataManager.formatNameWithId(n)
      : (n || "").trim();

    const prefix = `${m}-`;
    let maxSeq = 0;
    const usedIds = new Set();

    this.workbooks[m].forEach(t => {
      if (t.task_id) {
        usedIds.add(t.task_id);
        if (t.task_id.startsWith(prefix)) {
          const numPart = t.task_id.substring(prefix.length).split('-')[0];
          const num = parseInt(numPart, 10);
          if (!isNaN(num) && num > maxSeq) {
            maxSeq = num;
          }
        }
      }
    });

    let deletedIds = new Set();
    try {
      const d = JSON.parse(localStorage.getItem('walton_deleted_task_ids') || '[]');
      d.forEach(id => deletedIds.add(id));
    } catch (e) {}

    const createdTasks = [];
    const nowIso = new Date().toISOString();
    let tombstoneModified = false;

    for (const t of taskList) {
      let engineerOrAssignee = t.assignee || t.engineer || "Sazzad (50463)";
      let taskName = (t.task_name || "").trim();
      let includeInReport = t.include_in_report === "NO" ? "NO" : "YES";
      let taskDetails = (t.task_details || "").trim();
      let category = (t.category || "Process development").trim();
      let points = (t.points !== "" && t.points !== undefined && t.points !== null && !isNaN(parseFloat(t.points))) ? parseFloat(t.points) : "";
      let supervisor = t.supervisor || "Kamrul (44819)";

      maxSeq++;
      let randSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
      let candidateId = `${prefix}${String(maxSeq).padStart(3, "0")}-${randSuffix}`;

      let attempts = 0;
      while ((usedIds.has(candidateId) || deletedIds.has(candidateId)) && attempts < 500) {
        maxSeq++;
        attempts++;
        randSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
        candidateId = `${prefix}${String(maxSeq).padStart(3, "0")}-${randSuffix}`;
      }

      usedIds.add(candidateId);
      if (deletedIds.has(candidateId)) {
        deletedIds.delete(candidateId);
        tombstoneModified = true;
      }

      const cleanAssignee = formatName(engineerOrAssignee);
      const cleanSupervisor = formatName(supervisor);

      const isProject = Boolean(t.is_project || category === 'Ongoing Projects' || category === 'Completed Projects');
      const projectStatus = t.project_status || (category === 'Completed Projects' ? 'Completed' : (isProject ? 'Ongoing' : ''));
      const deadline = t.deadline || "";

      const newTask = {
        task_id: candidateId,
        month: m,
        assignee: cleanAssignee,
        engineer: cleanAssignee,
        supervisor: cleanSupervisor,
        task_name: taskName,
        task_details: taskDetails,
        category: category,
        points: points,
        include_in_report: includeInReport,
        status: "",
        remarks: "",
        photo_1: "",
        photo_2: "",
        is_project: isProject,
        project_status: projectStatus,
        deadline: deadline,
        _isLocalDraft: true,
        created_at: nowIso,
        last_updated: nowIso,
        updated_at: nowIso
      };

      this.workbooks[m].push(newTask);
      createdTasks.push(newTask);
    }

    if (tombstoneModified) {
      try {
        localStorage.setItem('walton_deleted_task_ids', JSON.stringify(Array.from(deletedIds)));
      } catch (e) {}
    }

    // Persist all inserted tasks in localStorage in ONE single write
    this.save();

    // Broadcast batch to Firebase RTDB in background
    if (typeof FirebaseSyncService !== 'undefined' && FirebaseSyncService.isConnected()) {
      if (typeof FirebaseSyncService.pushTasksBatch === 'function') {
        FirebaseSyncService.pushTasksBatch(m, createdTasks).catch(console.warn);
      } else {
        createdTasks.forEach(tk => FirebaseSyncService.pushTask(m, tk));
      }
    }

    // Push to Google Sheets asynchronously in background
    if (typeof GoogleSheetsSync !== 'undefined' && GoogleSheetsSync.pushTask) {
      createdTasks.forEach(tk => {
        GoogleSheetsSync.pushTask(tk).catch(() => {});
      });
    }

    return createdTasks;
  }

  updateTask(month, taskId, updates = {}) {
    const m = this.normalizeMonth(month);
    const tasks = this.workbooks[m] || [];
    let idx = tasks.findIndex(t => t.task_id === taskId);
    if (idx === -1) {
      console.warn(`Task ${taskId} not found in in-memory ${m}, auto-recovering...`);
      let domName = "";
      let domDetails = "";
      if (typeof document !== 'undefined') {
        const nameInput = document.getElementById(`task-name-input-${taskId}`);
        if (nameInput) domName = nameInput.value;
        const detInput = document.getElementById(`task-details-input-${taskId}`);
        if (detInput) domDetails = detInput.value;
      }
      const recoveredTask = {
        task_id: taskId,
        month: m,
        task_name: domName || updates.task_name || "",
        task_details: domDetails || updates.task_details || "",
        category: updates.category || "Process development",
        points: updates.points !== undefined ? updates.points : "",
        supervisor: updates.supervisor || "Kamrul (44819)",
        assignee: updates.assignee || updates.engineer || "Sazzad (50463)",
        engineer: updates.assignee || updates.engineer || "Sazzad (50463)",
        include_in_report: "YES",
        _isLocalDraft: true,
        created_at: new Date().toISOString(),
        last_updated: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        ...updates
      };
      tasks.push(recoveredTask);
      this.workbooks[m] = tasks;
      idx = tasks.length - 1;
    }

    const formatName = (n) => (typeof MasterDataManager !== 'undefined' && MasterDataManager.formatNameWithId)
      ? MasterDataManager.formatNameWithId(n)
      : (n || "").trim();

    const updated = {
      ...tasks[idx],
      ...updates,
      task_id: tasks[idx].task_id,
      month: m,
      _lastFieldEditTime: Date.now(),
      updated_at: new Date().toISOString(),
      last_updated: new Date().toISOString()
    };

    if (updates.assignee) {
      updated.assignee = formatName(updates.assignee);
      updated.engineer = updated.assignee;
    } else if (updates.engineer) {
      updated.engineer = formatName(updates.engineer);
      updated.assignee = updated.engineer;
    }

    if (updates.supervisor !== undefined) {
      updated.supervisor = formatName(updates.supervisor);
    }

    if (updates.include_in_report) {
      updated.include_in_report = updates.include_in_report === "NO" ? "NO" : "YES";
    }

    if (updates.points !== undefined) {
      const currentPts = (tasks[idx].points !== undefined && tasks[idx].points !== null && tasks[idx].points !== "" && !isNaN(parseFloat(tasks[idx].points)))
        ? parseFloat(tasks[idx].points)
        : null;
      const isHodUnlocked = (typeof MonthlyInputView !== 'undefined' && typeof MonthlyInputView.isHodPointUnlocked === 'function')
        ? MonthlyInputView.isHodPointUnlocked()
        : false;

      // REQUIREMENT: "HOD ekber task jeta dibe seta fix hobe. HOD change na korle kono vabei sei value change hobe na."
      // If task already has a point set by HOD, and current session is NOT unlocked as HOD, NEVER allow changing/wiping it!
      if (currentPts !== null && !isHodUnlocked) {
        updated.points = currentPts;
      } else {
        const newPts = (updates.points !== "" && updates.points !== null && !isNaN(parseFloat(updates.points)))
          ? parseFloat(updates.points)
          : "";
        if (newPts === "" && currentPts !== null && !isHodUnlocked) {
          updated.points = currentPts;
        } else {
          updated.points = newPts;
          if (newPts !== "") {
            updated.hod_point_set_at = Date.now();
            updated.hod_point_locked = true;
          }
        }
      }
    }

    tasks[idx] = updated;
    this.save();
    if (typeof FirebaseSyncService !== 'undefined' && FirebaseSyncService.isConnected()) {
      FirebaseSyncService.pushTask(m, updated);
    }
    if (typeof GoogleSheetsSync !== 'undefined' && GoogleSheetsSync.pushTask) {
      GoogleSheetsSync.pushTask(updated);
    }
    return updated;
  }

  /**
   * Calculates Points Ranking & WBS Points as per Image 1 specifications
   * Formula:
   * - Assignee receives 100% of Task Point in Total Point (Actual Point)
   * - Assignee receives 75% in WBS Point (0.75 * P)
   * - Supervisor receives 25% in WBS Point (0.25 * P) summed into their existing row (no duplicate row)
   * - Kamrul is HOD, excluded from ranking table
   * - Names strictly displayed in "Name (ID)" format
   * - Ranking table sorts by Total Point (Actual Point) descending
   */
  calculatePointsRanking(month) {
    const m = this.normalizeMonth(month);
    const tasks = this.getTasksForMonth(m);

    const personnelMap = {};

    const formatName = (n) => {
      if (!n || !n.trim()) return "";
      return (typeof MasterDataManager !== 'undefined' && MasterDataManager.formatNameWithId)
        ? MasterDataManager.formatNameWithId(n)
        : n.trim();
    };

    const isHod = (canonical) => {
      if (!canonical) return false;
      const lower = canonical.toLowerCase();
      return lower.includes("kamrul") || lower.includes("44819");
    };

    const getOrInit = (rawName) => {
      const canonical = formatName(rawName);
      if (!canonical) return null;

      if (!personnelMap[canonical]) {
        personnelMap[canonical] = {
          name: canonical,
          total_point: 0,
          total_task: 0,
          wbs_point: 0,
          own_point: 0,
          supervisor_point: 0,
          supervised_tasks: 0
        };
      }
      return personnelMap[canonical];
    };

    tasks.forEach(t => {
      const pts = parseFloat(t.points);
      const validPts = (!isNaN(pts) && pts > 0) ? pts : 0;

      // 1. Assignee: 100% Task Point into Total Point and WBS Base
      const assigneeName = t.assignee || t.engineer;
      let canonicalAssignee = "";
      if (assigneeName && assigneeName.trim()) {
        canonicalAssignee = formatName(assigneeName);
        const assigneeEntry = getOrInit(assigneeName);
        if (assigneeEntry) {
          assigneeEntry.own_point += validPts;
          assigneeEntry.total_task += 1;
        }
      }

      // 2. Supervisor: 25% added to Total Point & WBS Point
      // "WBS e supervisor er 25% point add hoy. Total point er sathe kew jodi supervisor hoy tahole sei point gulor 25% add hoye jabe."
      const supName = t.supervisor;
      if (supName && supName.trim()) {
        const canonicalSup = formatName(supName);
        // Exclude Kamrul if HOD, but add to any supervisor engineer (e.g. Sazzad or other supervisors)
        if (!isHod(canonicalSup)) {
          const supEntry = getOrInit(supName);
          if (supEntry) {
            const supPts = Math.round(validPts * 0.25 * 100) / 100;
            supEntry.supervisor_point += supPts;
            supEntry.supervised_tasks = (supEntry.supervised_tasks || 0) + 1;
          }
        }
      }
    });

    // Compute Total Point and WBS Point: Total Point = Own + 25% Supervisor Points
    Object.values(personnelMap).forEach(r => {
      r.total_point = Math.round((r.own_point + r.supervisor_point) * 100) / 100;
      r.wbs_point = r.total_point; // WBS Point reflects total point with supervisor 25% evaluation
      r.supervisor_point = Math.round(r.supervisor_point * 100) / 100;
      r.own_point = Math.round(r.own_point * 100) / 100;
    });

    // Sort by Total Point (Actual Point) descending (Image 1 Ranking)
    // Kamrul is HOD, excluded from competitive engineer ranking table
    const ranking = Object.values(personnelMap)
      .filter(r => !isHod(r.name) && (r.total_task > 0 || r.total_point > 0 || r.wbs_point > 0))
      .sort((a, b) => {
        if (b.total_point !== a.total_point) return b.total_point - a.total_point;
        if (b.wbs_point !== a.wbs_point) return b.wbs_point - a.wbs_point;
        return b.total_task - a.total_task;
      });

    const totalTasksSum = tasks.length;
    const totalWbsSum = Math.round(ranking.reduce((sum, r) => sum + r.wbs_point, 0));
    const totalActualSum = tasks.reduce((sum, t) => {
      const p = parseFloat(t.points);
      return sum + ((!isNaN(p) && p > 0) ? p : 0);
    }, 0);

    return {
      ranking,
      totalTasksSum,
      totalWbsSum,
      totalActualSum
    };
  }

  toggleInclude(month, taskId) {
    const m = this.normalizeMonth(month);
    const tasks = this.workbooks[m] || [];
    const task = tasks.find(t => t.task_id === taskId);
    if (!task) return null;
    const newStatus = task.include_in_report === "YES" ? "NO" : "YES";
    return this.updateTask(m, taskId, { include_in_report: newStatus });
  }

  deleteTask(month, taskId) {
    if (!taskId) return false;
    if (typeof SAZZAD_PROTECTED_TASK_IDS !== 'undefined' && SAZZAD_PROTECTED_TASK_IDS.has(taskId)) {
      console.warn(`🛡️ Refusing to delete protected task: ${taskId}`);
      return false;
    }
    const m = this.normalizeMonth(month);
    if (!this.workbooks[m]) return false;
    const initialLen = this.workbooks[m].length;
    this.workbooks[m] = this.workbooks[m].filter(t => t.task_id !== taskId);
    if (this.workbooks[m].length !== initialLen) {
      try {
        const deleted = JSON.parse(localStorage.getItem('walton_deleted_task_ids') || '[]');
        if (!deleted.includes(taskId)) {
          deleted.push(taskId);
          if (deleted.length > 500) deleted.splice(0, deleted.length - 500);
          localStorage.setItem('walton_deleted_task_ids', JSON.stringify(deleted));
        }
      } catch (e) {}

      // Immediately purge any pending sync of this deleted task from queue
      if (typeof GoogleSheetsSync !== 'undefined' && GoogleSheetsSync.getPendingQueue && GoogleSheetsSync.savePendingQueue) {
        try {
          const q = GoogleSheetsSync.getPendingQueue();
          const cleanQ = q.filter(item => !(item.action === 'SYNC_TASK' && item.payload && item.payload.task_id === taskId));
          if (cleanQ.length !== q.length) {
            GoogleSheetsSync.savePendingQueue(cleanQ);
          }
        } catch (e) {}
      }

      this.save();

      // Clean presentation active slides cache so Monthly Report reflects deletions instantly
      try {
        const slideKey = `walton_pd_active_slides_${m}`;
        const savedSlides = localStorage.getItem(slideKey);
        if (savedSlides) {
          const slides = JSON.parse(savedSlides);
          if (Array.isArray(slides)) {
            const filteredSlides = slides.filter(s => s.task_id !== taskId);
            localStorage.setItem(slideKey, JSON.stringify(filteredSlides));
          }
        }
      } catch (e) {}

      if (typeof GoogleSheetsSync !== 'undefined' && GoogleSheetsSync.deleteTask) {
        GoogleSheetsSync.deleteTask(taskId, m);
      }
      if (typeof FirebaseSyncService !== 'undefined' && FirebaseSyncService.deleteTask) {
        try {
          FirebaseSyncService.deleteTask(m, taskId);
        } catch (e) {
          console.warn("Firebase deleteTask notice:", e);
        }
      }
      return true;
    }
    return false;
  }

  deleteMultipleTasks(month, taskIds = []) {
    if (!Array.isArray(taskIds) || taskIds.length === 0) return { success: true, deletedCount: 0, count: 0 };
    if (typeof SAZZAD_PROTECTED_TASK_IDS !== 'undefined') {
      taskIds = taskIds.filter(id => !SAZZAD_PROTECTED_TASK_IDS.has(id));
      if (taskIds.length === 0) return { success: true, deletedCount: 0, count: 0 };
    }
    const m = this.normalizeMonth(month);
    if (!this.workbooks[m]) return { success: true, deletedCount: 0, count: 0 };
    const initialLen = this.workbooks[m].length;
    const toDeleteSet = new Set(taskIds);
    this.workbooks[m] = this.workbooks[m].filter(t => !toDeleteSet.has(t.task_id));
    const deletedCount = initialLen - this.workbooks[m].length;
    if (deletedCount > 0) {
      try {
        const deleted = JSON.parse(localStorage.getItem('walton_deleted_task_ids') || '[]');
        taskIds.forEach(id => {
          if (!deleted.includes(id)) deleted.push(id);
        });
        if (deleted.length > 500) deleted.splice(0, deleted.length - 500);
        localStorage.setItem('walton_deleted_task_ids', JSON.stringify(deleted));
      } catch (e) {}

      // Immediately purge any pending sync for all deleted tasks
      if (typeof GoogleSheetsSync !== 'undefined' && GoogleSheetsSync.getPendingQueue && GoogleSheetsSync.savePendingQueue) {
        try {
          const q = GoogleSheetsSync.getPendingQueue();
          const cleanQ = q.filter(item => !(item.action === 'SYNC_TASK' && item.payload && toDeleteSet.has(item.payload.task_id)));
          if (cleanQ.length !== q.length) {
            GoogleSheetsSync.savePendingQueue(cleanQ);
          }
        } catch (e) {}
      }

      this.save();

      // Clean presentation active slides cache so Monthly Report reflects bulk deletions instantly
      try {
        const slideKey = `walton_pd_active_slides_${m}`;
        const savedSlides = localStorage.getItem(slideKey);
        if (savedSlides) {
          const slides = JSON.parse(savedSlides);
          if (Array.isArray(slides)) {
            const filteredSlides = slides.filter(s => !toDeleteSet.has(s.task_id));
            localStorage.setItem(slideKey, JSON.stringify(filteredSlides));
          }
        }
      } catch (e) {}

      if (typeof GoogleSheetsSync !== 'undefined') {
        if (GoogleSheetsSync.deleteMultipleTasks) {
          GoogleSheetsSync.deleteMultipleTasks(taskIds, m);
        } else if (GoogleSheetsSync.deleteTask) {
          taskIds.forEach(id => {
            GoogleSheetsSync.deleteTask(id, m);
          });
        }
      }

      // Propagate to Firebase Realtime Database
      if (typeof FirebaseSyncService !== 'undefined') {
        try {
          if (FirebaseSyncService.deleteMultipleTasks) {
            FirebaseSyncService.deleteMultipleTasks(m, taskIds);
          } else if (FirebaseSyncService.deleteTask) {
            taskIds.forEach(id => {
              FirebaseSyncService.deleteTask(m, id);
            });
          }
        } catch (e) {
          console.warn("Firebase deleteMultipleTasks notice:", e);
        }
      }
    }
    return { success: true, deletedCount: deletedCount, count: deletedCount };
  }

  getPreviousMonth(month) {
    const m = this.normalizeMonth(month);
    return this.calculatePreviousMonthCode(m);
  }

  syncOngoingProjectsFromPreviousMonth(targetMonth) {
    const m = this.normalizeMonth(targetMonth);
    const prevMonth = this.getPreviousMonth(m);
    if (!prevMonth) {
      return { added: 0, prevMonth: null, message: "No preceding month found." };
    }

    // CRITICAL AIRTIGHT GUARD: Never carry forward tasks from historical imported dataset (AUG-2026 or older)
    if (m === "SEP-2026" || prevMonth === "AUG-2026" || prevMonth.includes("2026-08")) {
      return {
        added: 0,
        syncedCount: 0,
        prevMonth: prevMonth,
        message: `${prevMonth} is an archived dataset. Strategic projects for ${m} are managed exclusively via New Project Task.`
      };
    }

    const prevTasks = this.getTasksForMonth(prevMonth);
    const currentTasks = this.getTasksForMonth(m);

    // Identify genuine active ongoing strategic projects from previous month ONLY
    const ongoingProjects = prevTasks.filter(t => {
      if (!t || !t.task_id) return false;
      const isExplicitProject = Boolean(t.is_project && (t.task_id.startsWith('PROJ-') || (t.category || '').toLowerCase() === 'ongoing projects'));
      const status = (t.status || t.project_status || '').toLowerCase();
      const isCompleted = status.includes('complete') || (t.category || '').toLowerCase().includes('completed');
      return isExplicitProject && !isCompleted;
    });

    let addedCount = 0;
    ongoingProjects.forEach(proj => {
      // Avoid duplicate tasks by task_name
      const alreadyExists = currentTasks.some(ct => 
        ct.task_name && proj.task_name &&
        ct.task_name.trim().toLowerCase() === proj.task_name.trim().toLowerCase()
      );

      if (!alreadyExists) {
        this.addTask(
          m,
          proj.assignee || proj.engineer,
          proj.task_name,
          proj.include_in_report !== "NO" ? "YES" : "NO",
          proj.task_details || "",
          "Ongoing Projects",
          (proj.points !== undefined && proj.points !== null && proj.points !== "") ? proj.points : "",
          proj.supervisor || "Kamrul (44819)",
          {
            is_project: true,
            project_status: "Ongoing",
            deadline: proj.deadline || ""
          }
        );
        addedCount++;
      }
    });

    if (addedCount > 0) {
      this.save();
    }

    return {
      added: addedCount,
      syncedCount: addedCount,
      prevMonth: prevMonth,
      message: `Carried forward ${addedCount} active ongoing project(s) from ${prevMonth} to ${m}.`
    };
  }

  mergeFromCloud(remoteWorkbooks, isAuthoritative = false) {
    if (!remoteWorkbooks || typeof remoteWorkbooks !== 'object') return false;
    let anyChanges = false;
    const months = Object.keys(remoteWorkbooks);

    let deletedIds = [];
    try {
      deletedIds = JSON.parse(localStorage.getItem('walton_deleted_task_ids') || '[]');
    } catch (e) {}
    if (typeof SAZZAD_PROTECTED_TASK_IDS !== 'undefined') {
      deletedIds = deletedIds.filter(id => !SAZZAD_PROTECTED_TASK_IDS.has(id));
    }

    months.forEach(m => {
      const norm = this.normalizeMonth(m);
      const remoteList = remoteWorkbooks[m];
      if (!Array.isArray(remoteList)) return;

      if (!this.workbooks[norm]) {
        this.workbooks[norm] = [];
      }
      const localTasks = this.workbooks[norm];
      const localMap = new Map();
      localTasks.forEach(t => localMap.set(t.task_id, t));
      const remoteIdSet = new Set();

      remoteList.forEach(rt => {
        if (!rt || !rt.task_id) return;

        // Strict Tombstone Defense: A task deleted by the user MUST NEVER resurrect!
        if (deletedIds.includes(rt.task_id)) {
          if (localMap.has(rt.task_id)) {
            const idx = localTasks.findIndex(t => t.task_id === rt.task_id);
            if (idx !== -1) {
              localTasks.splice(idx, 1);
              localMap.delete(rt.task_id);
              anyChanges = true;
            }
          }
          return;
        }

        // Strict Blacklist Defense: Blacklisted engineers (Mahmud 51020, etc.) must NEVER enter!
        const assStr = String(rt.assignee || rt.engineer || '');
        if (typeof REMOVED_ENGINEER_IDS !== 'undefined') {
          for (const rId of REMOVED_ENGINEER_IDS) {
            if (assStr.includes(rId)) {
              if (localMap.has(rt.task_id)) {
                const idx = localTasks.findIndex(t => t.task_id === rt.task_id);
                if (idx !== -1) {
                  localTasks.splice(idx, 1);
                  localMap.delete(rt.task_id);
                  anyChanges = true;
                }
              }
              return;
            }
          }
        }

        remoteIdSet.add(rt.task_id);
        rt.month = norm;
        if (!rt.assignee && rt.engineer) rt.assignee = rt.engineer;
        if (!rt.engineer && rt.assignee) rt.engineer = rt.assignee;

        // Auto-sanitize supervisor so legacy Sazzad/50463 entries from Google Sheets become Kamrul (44819)
        if (!rt.supervisor || String(rt.supervisor).toLowerCase().includes('sazzad') || String(rt.supervisor).includes('50463')) {
          rt.supervisor = 'Kamrul (44819)';
        }

        if (rt.points !== "" && rt.points !== undefined && rt.points !== null && !isNaN(parseFloat(rt.points))) {
          rt.points = parseFloat(rt.points);
        } else {
          rt.points = "";
        }

        const lt = localMap.get(rt.task_id);
        if (!lt) {
          localTasks.push(rt);
          localMap.set(rt.task_id, rt);
          anyChanges = true;

          // Automatically hydrate photos into photoManager & IndexedDB
          if (typeof photoManager !== 'undefined' && (rt.photo_1 || rt.photo_2)) {
            if (rt.photo_1) photoManager.setTaskPhoto(rt.task_id, 'before_photo', rt.photo_1, rt.photo_1);
            if (rt.photo_2) photoManager.setTaskPhoto(rt.task_id, 'after_photo', rt.photo_2, rt.photo_2);
          }
        } else {
          let needsCloudPushBack = false;

          // If remote task has photos and local task or photoManager does not, hydrate!
          // CRITICAL SAFEGUARD: Never resurrect photos if local user deleted them or cleared photos!
          const isRecentBeforeDelete = lt._photoDeleted_before && (Date.now() - lt._photoDeleted_before < 300000);
          const isRecentAfterDelete = lt._photoDeleted_after && (Date.now() - lt._photoDeleted_after < 300000);
          const isRecentPhotoEdit = lt._lastPhotoEditTime && (Date.now() - lt._lastPhotoEditTime < 120000);

          if (typeof photoManager !== 'undefined') {
            const currentPhotos = photoManager.getTaskPhotos(rt.task_id);

            // Hydrate before_photo only if remote has it AND local did NOT delete it
            if (rt.photo_1 && (!currentPhotos || !currentPhotos.before_photo)) {
              if (!isRecentBeforeDelete && !isRecentPhotoEdit && !lt.clear_photos && lt.photo_1 !== "") {
                photoManager.setTaskPhoto(rt.task_id, 'before_photo', rt.photo_1, rt.photo_1);
                lt.photo_1 = rt.photo_1;
                anyChanges = true;
              } else if (lt.photo_1 === "" || isRecentBeforeDelete || lt.clear_photos) {
                needsCloudPushBack = true;
              }
            }

            // Hydrate after_photo only if remote has it AND local did NOT delete it
            if (rt.photo_2 && (!currentPhotos || !currentPhotos.after_photo)) {
              if (!isRecentAfterDelete && !isRecentPhotoEdit && !lt.clear_photos && lt.photo_2 !== "") {
                photoManager.setTaskPhoto(rt.task_id, 'after_photo', rt.photo_2, rt.photo_2);
                lt.photo_2 = rt.photo_2;
                anyChanges = true;
              } else if (lt.photo_2 === "" || isRecentAfterDelete || lt.clear_photos) {
                needsCloudPushBack = true;
              }
            }

            // Preserve existing photos: Remote cloud only syncs text/numbers, so never delete local or server photos!
          }

          // Check for actual data differences on meaningful user-facing fields
          const checkFields = ['task_name', 'task_details', 'category', 'points', 'assignee', 'supervisor', 'status', 'remarks', 'tms_task_id', 'include_in_report', 'photo_1', 'photo_2'];
          let isDifferent = false;
          for (const k of checkFields) {
            const rVal = String(rt[k] !== undefined && rt[k] !== null ? rt[k] : '').trim();
            const lVal = String(lt[k] !== undefined && lt[k] !== null ? lt[k] : '').trim();
            if (rVal !== lVal) {
              isDifferent = true;
              break;
            }
          }

          if (isDifferent) {
            const localTimestamp = lt.last_updated ? new Date(lt.last_updated).getTime() : (lt._lastFieldEditTime || 0);
            const remoteTimestamp = rt.last_updated ? new Date(rt.last_updated).getTime() : 0;
            const isLocalStrictlyNewer = localTimestamp > remoteTimestamp && remoteTimestamp > 0;

            // NON-DESTRUCTIVE MULTI-DEVICE PROTECTION:
            for (const k of Object.keys(rt)) {
              const rVal = rt[k];
              const lVal = lt[k];

              // 1. POINTS SYNCHRONIZATION & IMMUTABILITY:
              // Requirement: "HOD ekber task jeta dibe seta fix hobe. HOD change na korle kono vabei sei value change hobe na."
              if (k === 'points') {
                const rNum = (rVal !== undefined && rVal !== null && rVal !== "" && !isNaN(parseFloat(rVal))) ? parseFloat(rVal) : null;
                const lNum = (lVal !== undefined && lVal !== null && lVal !== "" && !isNaN(parseFloat(lVal))) ? parseFloat(lVal) : null;

                if (lNum !== null && rNum === null) {
                  // Local already has points, remote is missing: keep local & push back to cloud
                  needsCloudPushBack = true;
                  continue;
                }
                if (lNum !== null && rNum !== null) {
                  const rHodTime = rt.hod_point_set_at || 0;
                  const lHodTime = lt.hod_point_set_at || 0;

                  if (rHodTime > lHodTime) {
                    // Remote has a strictly newer HOD evaluation timestamp
                    lt.points = rNum;
                    lt.hod_point_set_at = rHodTime;
                    lt.hod_point_locked = true;
                  } else if (lHodTime > rHodTime) {
                    // Local HOD evaluation is newer: keep local and push to cloud!
                    needsCloudPushBack = true;
                  } else {
                    // Timestamps equal or not set: points can NEVER be reduced by a stale device!
                    const maxPts = Math.max(lNum, rNum);
                    lt.points = maxPts;
                    if (rNum < maxPts) {
                      needsCloudPushBack = true;
                    }
                  }
                  continue;
                }
                if (lNum === null && rNum !== null) {
                  lt.points = rNum;
                  if (rt.hod_point_set_at) lt.hod_point_set_at = rt.hod_point_set_at;
                  lt.hod_point_locked = true;
                  continue;
                }
              }

              // 2. TEXT FIELDS PROTECTION: Never wipe non-empty task_name or task_details with empty or default placeholder strings
              if (k === 'task_name' || k === 'task_details') {
                const rStr = (rVal !== undefined && rVal !== null) ? String(rVal).trim() : '';
                const lStr = (lVal !== undefined && lVal !== null) ? String(lVal).trim() : '';
                if (rStr === '' && lStr !== '') {
                  continue; // Keep local non-empty text!
                }
                // Never overwrite genuine local name with default placeholder!
                if (rStr === 'New Engineering Task' && lStr !== '' && lStr !== 'New Engineering Task') {
                  needsCloudPushBack = true;
                  continue;
                }
                if (isLocalStrictlyNewer && lStr !== '') {
                  continue;
                }
                if (lt._lastFieldEditTime && (Date.now() - lt._lastFieldEditTime < 15000) && lStr !== '') {
                  continue; // User actively edited locally within last 15s
                }
              }

              // 3. PHOTOS PROTECTION:
              if (k === 'photo_1' || k === 'photo_2') {
                const isBeforeSlot = (k === 'photo_1');
                const isRecentDelete = isBeforeSlot
                  ? (lt._photoDeleted_before && (Date.now() - lt._photoDeleted_before < 300000))
                  : (lt._photoDeleted_after && (Date.now() - lt._photoDeleted_after < 300000));
                const isRecentPhotoEdit = lt._lastPhotoEditTime && (Date.now() - lt._lastPhotoEditTime < 120000);

                // If remote has photo but local deleted it: DO NOT OVERWRITE LOCAL DELETION!
                if (rVal && !lVal && (isRecentDelete || isRecentPhotoEdit || lt.clear_photos || lVal === "")) {
                  needsCloudPushBack = true;
                  continue;
                }

                // If local has photo and remote doesn't, but local was recent: keep local!
                if (!rVal && lVal && isRecentPhotoEdit) {
                  continue;
                }
              }

              // 4. SUPERVISOR AUTO-GUARD:
              if (k === 'supervisor') {
                if (!rVal || String(rVal).toLowerCase().includes('sazzad') || String(rVal).includes('50463')) {
                  lt.supervisor = 'Kamrul (44819)';
                  continue;
                }
              }

              // 5. TMS IMMUTABILITY & PROTECTION:
              if (k === 'tms_task_id' || k === 'tms_url' || k === 'tms_synced_at') {
                const rTms = (rVal !== undefined && rVal !== null) ? String(rVal).trim() : '';
                const lTms = (lVal !== undefined && lVal !== null) ? String(lVal).trim() : '';
                if (lTms !== '' && rTms === '') {
                  needsCloudPushBack = true;
                  continue; // Never wipe local TMS badge
                }
                if (rTms !== '') {
                  lt[k] = rTms;
                  continue;
                }
              }

              const isRecentLocalEdit = lt._lastFieldEditTime && (Date.now() - lt._lastFieldEditTime < 10000);
              const isProtectedField = (k === 'points' || k === 'task_name' || k === 'task_details' || k === 'photo_1' || k === 'photo_2' || k === 'ai_report_title' || k === 'ai_report_description');
              
              if (isRecentLocalEdit && isProtectedField && (rVal === "" || rVal === null || rVal === undefined) && (lVal !== "" && lVal !== null && lVal !== undefined)) {
                // User locally edited in last 10 seconds, keep local
                continue;
              }

              if (isLocalStrictlyNewer && (lVal !== "" && lVal !== null && lVal !== undefined) && (rVal === "" || rVal === null || rVal === undefined)) {
                continue;
              }

              lt[k] = rVal;
            }
            anyChanges = true;
          }

          // If local points, deleted photos, or protected fields need cloud synchronization:
          if (needsCloudPushBack) {
            if (typeof FirebaseSyncService !== 'undefined' && FirebaseSyncService.isConnected()) {
              FirebaseSyncService.pushTask(norm, lt);
            }
            if (typeof GoogleSheetsSync !== 'undefined' && GoogleSheetsSync.pushTask) {
              GoogleSheetsSync.pushTask(lt);
            }
          }
        }
      });

      // Handle un-synced local tasks and remote deletions safely across multiple devices
      const shouldReconcile = isAuthoritative || remoteList.length > 0;
      if (shouldReconcile) {
        const filtered = localTasks.filter(lt => {
          if (!lt || !lt.task_id) return false;
          // Strict Tombstone: If user explicitly deleted this task, prune it
          if (deletedIds.includes(lt.task_id)) {
            return false;
          }

          // If remote list has this task, mark as synced to cloud
          if (remoteIdSet.has(lt.task_id)) {
            lt._syncedToCloud = true;
            delete lt._isLocalDraft;
            return true;
          }

          // In Authoritative Cloud Mode (Firebase is single source of truth):
          // If task does not exist in Firebase, prune it unless it was newly created locally in the last 2 minutes
          if (isAuthoritative) {
            if (typeof SAZZAD_PROTECTED_TASK_IDS !== 'undefined' && SAZZAD_PROTECTED_TASK_IDS.has(lt.task_id)) {
              return true; // 🛡️ NEVER prune protected tasks!
            }
            const isRecentDraft = Boolean(lt._isLocalDraft && lt.created_at && (Date.now() - new Date(lt.created_at).getTime() < 120000));
            if (!isRecentDraft) {
              return false; // Prune stale/deleted ghost task permanently
            }
          }

          return true;
        });

        if (filtered.length !== localTasks.length) {
          this.workbooks[norm] = filtered;
          anyChanges = true;
        }
      }

      // Sort tasks consistently by sequential task ID across all devices
      this.workbooks[norm].sort((a, b) => {
        const idA = String(a.task_id || '');
        const idB = String(b.task_id || '');
        return idA.localeCompare(idB, undefined, { numeric: true, sensitivity: 'base' });
      });
    });

    if (anyChanges) {
      this.save();
    }
    return anyChanges;
  }

  seedAug2026() {
    // AUG-2026 is fully hydrated from IMPORTED_2026_DATASET (258 production tasks)
    this.hydrateFromImported2026Dataset(true);
  }

  seedSep2026() {
    // SEP-2026 starts clean and empty for new user entries
    this.workbooks["SEP-2026"] = [];
    this.save();
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = MonthWorkbookManager;
} else if (typeof window !== 'undefined') {
  window.MonthWorkbookManager = MonthWorkbookManager;
}
