"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "../../lib/supabase";

type Student = {
  id: number;
  student_name: string | null;
  student_username: string;
  [key: string]: unknown;
};

type Fee = {
  id: number;
  student_id: number;
  month: number;
  year: number;
  amount: number;
  status: string;
  payment_date: string | null;
  transaction_id: string | null;
  remarks: string | null;
  payment_mode: string | null;
  created_at?: string;
};

const months = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const statuses = [
  "PENDING",
  "SUBMITTED",
  "REFUNDED",
  "CANCELLED",
];

const AUTOMATIC_FEE_REMARK =
  "Automatic monthly fee based on admission date.";

const DELETED_AUTO_FEE_STORAGE_KEY =
  "racer_academy_deleted_automatic_fees";

function normalizeText(value: unknown): string {
  return String(value ?? "")
    .trim()
    .toLowerCase();
}

function getStudentClass(student: Student): string {
  const possibleKeys = [
    "student_class",
    "class",
    "class_name",
    "grade",
    "standard",
    "student_grade",
  ];

  for (const key of possibleKeys) {
    const value = student[key];

    if (
      value !== undefined &&
      value !== null &&
      String(value).trim() !== ""
    ) {
      return String(value).trim();
    }
  }

  return "";
}

function isClassNineOrTen(student: Student): boolean {
  const studentClass =
    normalizeText(getStudentClass(student));

  return (
    studentClass === "9" ||
    studentClass === "9th" ||
    studentClass === "class 9" ||
    studentClass === "class 9th" ||
    studentClass === "ninth" ||
    studentClass === "10" ||
    studentClass === "10th" ||
    studentClass === "class 10" ||
    studentClass === "class 10th" ||
    studentClass === "tenth"
  );
}

function getFeeAmount(student: Student): number {
  return isClassNineOrTen(student) ? 300 : 200;
}

function getAdmissionDate(student: Student): string {
  const possibleKeys = [
    "admission_date",
    "admissionDate",
    "date_of_admission",
    "dateOfAdmission",
    "joining_date",
    "joiningDate",
  ];

  for (const key of possibleKeys) {
    const value = student[key];

    if (
      value !== undefined &&
      value !== null &&
      String(value).trim() !== ""
    ) {
      return String(value).trim();
    }
  }

  return "";
}

function parseLocalDate(
  value: string
): Date | null {
  if (!value) {
    return null;
  }

  const cleanValue = value.trim();

  /*
   * YYYY-MM-DD
   */
  const isoMatch =
    /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(
      cleanValue
    );

  if (isoMatch) {
    const year = Number(isoMatch[1]);
    const month = Number(isoMatch[2]);
    const day = Number(isoMatch[3]);

    const date = new Date(
      year,
      month - 1,
      day
    );

    if (
      date.getFullYear() === year &&
      date.getMonth() === month - 1 &&
      date.getDate() === day
    ) {
      return date;
    }

    return null;
  }

  /*
   * 02 Aug 2026
   */
  const textMatch =
    /^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})$/.exec(
      cleanValue
    );

  if (textMatch) {
    const day = Number(textMatch[1]);

    const monthText =
      textMatch[2]
        .toLowerCase()
        .slice(0, 3);

    const year = Number(textMatch[3]);

    const monthMap: Record<
      string,
      number
    > = {
      jan: 0,
      feb: 1,
      mar: 2,
      apr: 3,
      may: 4,
      jun: 5,
      jul: 6,
      aug: 7,
      sep: 8,
      oct: 9,
      nov: 10,
      dec: 11,
    };

    const month =
      monthMap[monthText];

    if (month !== undefined) {
      const date =
        new Date(
          year,
          month,
          day
        );

      if (
        date.getFullYear() === year &&
        date.getMonth() === month &&
        date.getDate() === day
      ) {
        return date;
      }
    }
  }

  /*
   * dd/mm/yyyy or dd-mm-yyyy
   */
  const slashMatch =
    /^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/.exec(
      cleanValue
    );

  if (slashMatch) {
    const day =
      Number(slashMatch[1]);

    const month =
      Number(slashMatch[2]);

    const year =
      Number(slashMatch[3]);

    const date =
      new Date(
        year,
        month - 1,
        day
      );

    if (
      date.getFullYear() === year &&
      date.getMonth() === month - 1 &&
      date.getDate() === day
    ) {
      return date;
    }
  }

  const parsed =
    new Date(cleanValue);

  if (
    Number.isNaN(
      parsed.getTime()
    )
  ) {
    return null;
  }

  return new Date(
    parsed.getFullYear(),
    parsed.getMonth(),
    parsed.getDate()
  );
}

function createDateOnly(
  year: number,
  monthIndex: number,
  day: number
): Date {
  return new Date(
    year,
    monthIndex,
    day
  );
}

function getDaysInMonth(
  year: number,
  monthIndex: number
): number {
  return new Date(
    year,
    monthIndex + 1,
    0
  ).getDate();
}

function getMonthlyAnniversary(
  admissionDate: Date,
  year: number,
  monthIndex: number
): Date {
  const daysInMonth =
    getDaysInMonth(
      year,
      monthIndex
    );

  const billingDay =
    Math.min(
      admissionDate.getDate(),
      daysInMonth
    );

  return createDateOnly(
    year,
    monthIndex,
    billingDay
  );
}

/*
 * ============================================================
 * CORRECT FEE CYCLE
 * ============================================================
 *
 * Admission: 10 August 2026
 *
 * August cycle:
 * Trigger  = 08 September
 * Complete = 10 September
 * Fee      = August 2026
 *
 * September cycle:
 * Trigger  = 08 October
 * Complete = 10 October
 * Fee      = September 2026
 *
 * October cycle:
 * Trigger  = 08 November
 * Complete = 10 November
 * Fee      = October 2026
 *
 * IMPORTANT:
 * Fee month is the START month of the cycle,
 * not the month of the trigger/completion date.
 * ============================================================
 */

function getFeeCycleForToday(
  admissionDate: Date,
  today: Date
): {
  feeMonth: number;
  feeYear: number;
  dueDate: Date;
  triggerDate: Date;
} {
  const admissionYear =
    admissionDate.getFullYear();

  const admissionMonth =
    admissionDate.getMonth();

  const todayOnly =
    createDateOnly(
      today.getFullYear(),
      today.getMonth(),
      today.getDate()
    );

  /*
   * First cycle starts in admission month.
   */
  let cycleYear =
    admissionYear;

  let cycleMonth =
    admissionMonth;

  while (true) {
    /*
     * Completion is one month after
     * the cycle month.
     */
    let dueYear =
      cycleYear;

    let dueMonth =
      cycleMonth + 1;

    if (dueMonth > 11) {
      dueMonth = 0;
      dueYear += 1;
    }

    const dueDate =
      getMonthlyAnniversary(
        admissionDate,
        dueYear,
        dueMonth
      );

    const triggerDate =
      createDateOnly(
        dueDate.getFullYear(),
        dueDate.getMonth(),
        dueDate.getDate() - 2
      );

    /*
     * If today's date is before or equal
     * to this cycle's trigger date,
     * this is the active cycle.
     */
    if (
      todayOnly <= triggerDate
    ) {
      return {
        feeMonth:
          cycleMonth + 1,

        feeYear:
          cycleYear,

        dueDate,

        triggerDate,
      };
    }

    /*
     * Otherwise move to next cycle.
     */
    cycleMonth += 1;

    if (cycleMonth > 11) {
      cycleMonth = 0;
      cycleYear += 1;
    }
  }
}

function isSameCalendarDate(
  first: Date,
  second: Date
): boolean {
  return (
    first.getFullYear() ===
      second.getFullYear() &&
    first.getMonth() ===
      second.getMonth() &&
    first.getDate() ===
      second.getDate()
  );
}

function shouldGenerateAutomaticFeeToday(
  admissionDateString: string,
  today: Date
): boolean {
  const admissionDate =
    parseLocalDate(
      admissionDateString
    );

  if (!admissionDate) {
    return false;
  }

  const todayOnly =
    createDateOnly(
      today.getFullYear(),
      today.getMonth(),
      today.getDate()
    );

  if (
    todayOnly < admissionDate
  ) {
    return false;
  }

  const cycle =
    getFeeCycleForToday(
      admissionDate,
      todayOnly
    );

  return isSameCalendarDate(
    todayOnly,
    cycle.triggerDate
  );
}

function getAutomaticFeeCycle(
  admissionDateString: string,
  today: Date
) {
  const admissionDate =
    parseLocalDate(
      admissionDateString
    );

  if (!admissionDate) {
    return null;
  }

  return getFeeCycleForToday(
    admissionDate,
    today
  );
}

/*
 * ============================================================
 * PERSISTENT DELETE MEMORY
 * ============================================================
 *
 * Deleted automatic fee keys are stored in the browser.
 *
 * Example:
 * 6-8-2026
 *
 * means:
 * Student ID 6
 * August 2026
 *
 * Once teacher deletes that automatic fee,
 * the same cycle will not recreate it after refresh.
 * ============================================================
 */

function getDeletedAutomaticFeeKeys(): string[] {
  if (
    typeof window ===
    "undefined"
  ) {
    return [];
  }

  try {
    const raw =
      window.localStorage.getItem(
        DELETED_AUTO_FEE_STORAGE_KEY
      );

    if (!raw) {
      return [];
    }

    const parsed =
      JSON.parse(raw);

    if (
      !Array.isArray(parsed)
    ) {
      return [];
    }

    return parsed.filter(
      (item): item is string =>
        typeof item === "string"
    );
  } catch {
    return [];
  }
}

function isAutomaticFeeDeleted(
  key: string
): boolean {
  return getDeletedAutomaticFeeKeys().includes(
    key
  );
}

function rememberDeletedAutomaticFee(
  key: string
): void {
  if (
    typeof window ===
    "undefined"
  ) {
    return;
  }

  try {
    const current =
      getDeletedAutomaticFeeKeys();

    if (
      current.includes(key)
    ) {
      return;
    }

    current.push(key);

    window.localStorage.setItem(
      DELETED_AUTO_FEE_STORAGE_KEY,
      JSON.stringify(current)
    );
  } catch {
    console.error(
      "Unable to remember deleted automatic fee."
    );
  }
}

function getAutomaticFeeKey(
  studentId: number,
  feeMonth: number,
  feeYear: number
): string {
  return `${studentId}-${feeMonth}-${feeYear}`;
}

function isAutomaticFee(
  fee: Fee
): boolean {
  return (
    String(
      fee.remarks || ""
    ).trim() ===
    AUTOMATIC_FEE_REMARK
  );
}

export default function TeacherFeesPage() {
  const [students, setStudents] =
    useState<Student[]>([]);

  const [fees, setFees] =
    useState<Fee[]>([]);

  const [studentId, setStudentId] =
    useState("");

  const [month, setMonth] =
    useState(
      String(
        new Date().getMonth() + 1
      )
    );

  const [year, setYear] =
    useState(
      String(
        new Date().getFullYear()
      )
    );

  const [amount, setAmount] =
    useState("200");

  const [status, setStatus] =
    useState("PENDING");

  const [paymentDate, setPaymentDate] =
    useState("");

  const [transactionId, setTransactionId] =
    useState("");

  const [remarks, setRemarks] =
    useState("");

  const [paymentMode, setPaymentMode] =
    useState("");

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [message, setMessage] =
    useState("");

  const [error, setError] =
    useState("");

  /*
   * Prevent duplicate initial loads.
   */
  const initialLoadDone =
    useRef(false);

  const [feeSearch, setFeeSearch] = useState("");
  const [feeFilter, setFeeFilter] = useState<"all" | "paid" | "pending">("all");
  const [feePage, setFeePage] = useState(1);

  useEffect(() => {
    if (
      initialLoadDone.current
    ) {
      return;
    }

    initialLoadDone.current = true;

    loadData(true);
  }, []);

  /*
   * ============================================================
   * CLEAN WRONG OLD AUTOMATIC FEES
   * ============================================================
   *
   * Old version created September 2026 for
   * August-admission students.
   *
   * On current August cycle we must remove
   * stale automatic rows that belong to a
   * future cycle.
   *
   * Manual fees are NEVER touched.
   */
  async function removeWrongAutomaticFees(
    studentList: Student[],
    existingFees: Fee[]
  ): Promise<Fee[]> {
    const automaticFees =
      existingFees.filter(
        isAutomaticFee
      );

    if (
      automaticFees.length === 0
    ) {
      return existingFees;
    }

    const idsToDelete: number[] =
      [];

    const now = new Date();

    for (
      const student of studentList
    ) {
      const admissionDateString =
        getAdmissionDate(
          student
        );

      if (
        !admissionDateString
      ) {
        continue;
      }

      const admissionDate =
        parseLocalDate(
          admissionDateString
        );

      if (!admissionDate) {
        continue;
      }

      const cycle =
        getAutomaticFeeCycle(
          admissionDateString,
          now
        );

      if (!cycle) {
        continue;
      }

      const currentKey =
        getAutomaticFeeKey(
          Number(student.id),
          cycle.feeMonth,
          cycle.feeYear
        );

      /*
       * Don't touch a current cycle that
       * was intentionally deleted.
       */
      const currentWasDeleted =
        isAutomaticFeeDeleted(
          currentKey
        );

      const studentAutomaticFees =
        automaticFees.filter(
          (fee) =>
            Number(
              fee.student_id
            ) ===
            Number(student.id)
        );

      for (
        const fee of studentAutomaticFees
      ) {
        const feeKey =
          getAutomaticFeeKey(
            Number(
              fee.student_id
            ),
            Number(fee.month),
            Number(fee.year)
          );

        /*
         * Current cycle is valid.
         */
        if (
          feeKey === currentKey
        ) {
          continue;
        }

        /*
         * A deleted key should remain
         * deleted.
         */
        if (
          isAutomaticFeeDeleted(
            feeKey
          )
        ) {
          idsToDelete.push(
            Number(fee.id)
          );
          continue;
        }

        /*
         * Any future automatic record
         * produced by an older buggy version
         * should not stay ahead of the
         * current cycle.
         *
         * We compare against current cycle.
         */
        const feeDate =
          createDateOnly(
            Number(fee.year),
            Number(fee.month) - 1,
            1
          );

        const currentCycleDate =
          createDateOnly(
            cycle.feeYear,
            cycle.feeMonth - 1,
            1
          );

        /*
         * Future stale automatic row:
         * delete it.
         *
         * Example:
         * Current cycle = August
         * Wrong old row = September
         */
        if (
          feeDate >
          currentCycleDate
        ) {
          idsToDelete.push(
            Number(fee.id)
          );
          continue;
        }

        /*
         * Special protection for the exact
         * old incorrect due-month record.
         *
         * August cycle's due month is September.
         * If old code made September automatic
         * row for this cycle, remove it.
         */
        const oldWrongMonth =
          cycle.dueDate.getMonth() + 1;

        const oldWrongYear =
          cycle.dueDate.getFullYear();

        if (
          Number(fee.month) ===
            oldWrongMonth &&
          Number(fee.year) ===
            oldWrongYear &&
          !currentWasDeleted
        ) {
          idsToDelete.push(
            Number(fee.id)
          );
        }
      }
    }

    const uniqueIds =
      Array.from(
        new Set(idsToDelete)
      );

    if (
      uniqueIds.length === 0
    ) {
      return existingFees;
    }

    const {
      error: cleanupError,
    } =
      await supabase
        .from("fees")
        .delete()
        .in(
          "id",
          uniqueIds
        );

    if (cleanupError) {
      console.error(
        "Automatic fee cleanup error:",
        cleanupError
      );

      return existingFees;
    }

    return existingFees.filter(
      (fee) =>
        !uniqueIds.includes(
          Number(fee.id)
        )
    );
  }

  async function ensureAutomaticFees(
    studentList: Student[],
    existingFees: Fee[]
  ) {
    const now = new Date();

    const cleanedFees =
      await removeWrongAutomaticFees(
        studentList,
        existingFees
      );

    const inserts: Array<{
      student_id: number;
      month: number;
      year: number;
      amount: number;
      status: string;
      payment_date: null;
      transaction_id: null;
      remarks: string;
      payment_mode: null;
    }> = [];

    for (
      const student of studentList
    ) {
      const admissionDateString =
        getAdmissionDate(
          student
        );

      if (
        !admissionDateString
      ) {
        continue;
      }

      /*
       * Generate only on exact trigger date.
       */
      if (
        !shouldGenerateAutomaticFeeToday(
          admissionDateString,
          now
        )
      ) {
        continue;
      }

      const cycle =
        getAutomaticFeeCycle(
          admissionDateString,
          now
        );

      if (!cycle) {
        continue;
      }

      /*
       * IMPORTANT:
       *
       * Admission 10 Aug
       * Today 08 Sep
       *
       * cycle.feeMonth = 8
       *
       * Therefore August fee.
       */
      const automaticFeeKey =
        getAutomaticFeeKey(
          Number(student.id),
          cycle.feeMonth,
          cycle.feeYear
        );

      /*
       * If teacher deleted this cycle,
       * never recreate it.
       */
      if (
        isAutomaticFeeDeleted(
          automaticFeeKey
        )
      ) {
        continue;
      }

      const alreadyExists =
        cleanedFees.some(
          (fee) =>
            Number(
              fee.student_id
            ) ===
              Number(student.id) &&
            Number(fee.month) ===
              cycle.feeMonth &&
            Number(fee.year) ===
              cycle.feeYear
        );

      if (
        alreadyExists
      ) {
        continue;
      }

      inserts.push({
        student_id:
          Number(student.id),

        month:
          cycle.feeMonth,

        year:
          cycle.feeYear,

        amount:
          getFeeAmount(
            student
          ),

        status:
          "PENDING",

        payment_date:
          null,

        transaction_id:
          null,

        remarks:
          AUTOMATIC_FEE_REMARK,

        payment_mode:
          null,
      });
    }

    if (
      inserts.length === 0
    ) {
      return;
    }

    const {
      error: insertError,
    } =
      await supabase
        .from("fees")
        .insert(
          inserts
        );

    if (insertError) {
      console.error(
        "Automatic fee creation error:",
        insertError
      );
    }
  }

  async function loadData(
    generateAutomatic = true
  ) {
    try {
      setLoading(true);
      setError("");

      const savedTeacherId = Number(localStorage.getItem("attendance_teacher_id") || "0");
      if (!Number.isInteger(savedTeacherId) || savedTeacherId <= 0) {
        throw new Error("Teacher ID was not found. Please login again as a teacher.");
      }

      let assignedStudentIds: number[] = [];
      if (savedTeacherId !== 1) {
        const { data: assignedData, error: assignedError } = await supabase.rpc("get_teacher_assigned_student_ids", { p_teacher_id: savedTeacherId });
        if (assignedError) throw new Error(assignedError.message);
        assignedStudentIds = (assignedData || []).map((item: { student_id: number }) => Number(item.student_id));
      }

      let studentsQuery = supabase.from("students").select("*").eq("is_active", true).order("student_name", { ascending: true });
      if (savedTeacherId !== 1) {
        if (assignedStudentIds.length === 0) {
          setStudents([]);
          setFees([]);
          return;
        }
        studentsQuery = studentsQuery.in("id", assignedStudentIds);
      }

      const { data: studentsData, error: studentsError } = await studentsQuery;
      if (studentsError) {
        setError(studentsError.message);
        return;
      }

      const studentList = (studentsData || []) as Student[];

      let feesQuery = supabase
        .from("fees")
        .select("*")
        .order("year", { ascending: false })
        .order("month", { ascending: false });
      if (savedTeacherId !== 1) {
        feesQuery = feesQuery.in("student_id", assignedStudentIds);
      }

      const { data: feesData, error: feesError } = await feesQuery;
      if (feesError) {
        setError(feesError.message);
        return;
      }

      let existingFees = (feesData || []) as Fee[];

      if (generateAutomatic) {
        await ensureAutomaticFees(studentList, existingFees);

        let refreshedFeesQuery = supabase
          .from("fees")
          .select("*")
          .order("year", { ascending: false })
          .order("month", { ascending: false });
        if (savedTeacherId !== 1) {
          refreshedFeesQuery = refreshedFeesQuery.in("student_id", assignedStudentIds);
        }

        const { data: refreshedFees, error: refreshedFeesError } = await refreshedFeesQuery;
        if (refreshedFeesError) {
          setError(refreshedFeesError.message);
          return;
        }

        existingFees = (refreshedFees || []) as Fee[];
      }

      setStudents(studentList);
      setFees(existingFees);
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load fee management data."
      );
    } finally {
      setLoading(false);
    }
  }
  async function saveFee(
    e: React.FormEvent<HTMLFormElement>
  ) {
    e.preventDefault();

    setMessage("");
    setError("");

    if (!studentId) {
      setError(
        "Please select a student."
      );
      return;
    }

    if (
      !amount ||
      Number(amount) < 0
    ) {
      setError(
        "Please enter a valid amount."
      );
      return;
    }

    /*
     * CASH required only when
     * teacher marks SUBMITTED.
     */
    if (
      status === "SUBMITTED" &&
      paymentMode !== "CASH"
    ) {
      setError(
        "Please select CASH payment mode for a cash payment."
      );
      return;
    }

    const currentTeacherId = Number(localStorage.getItem("attendance_teacher_id") || "0");
    if (!Number.isInteger(currentTeacherId) || currentTeacherId <= 0) {
      setError("Teacher ID was not found. Please login again as a teacher.");
      return;
    }

    if (currentTeacherId !== 1) {
      const { data: assignedData, error: assignedError } = await supabase.rpc("get_teacher_assigned_student_ids", { p_teacher_id: currentTeacherId });
      if (assignedError) {
        setError(assignedError.message);
        return;
      }
      const isAssigned = (assignedData || []).some((row: { student_id: number }) => Number(row.student_id) === Number(studentId));
      if (!isAssigned) {
        setError("You can only manage fees for students assigned to you.");
        return;
      }
    }

    setSaving(true);

    try {
      const {
        data: existingFees,
        error:
          existingError,
      } =
        await supabase
          .from("fees")
          .select("id")
          .eq(
            "student_id",
            Number(studentId)
          )
          .eq(
            "month",
            Number(month)
          )
          .eq(
            "year",
            Number(year)
          )
          .order(
            "id",
            {
              ascending:
                false,
            }
          )
          .limit(1);

      if (existingError) {
        setError(
          existingError.message
        );
        return;
      }

      const feeData = {
        student_id:
          Number(studentId),

        month:
          Number(month),

        year:
          Number(year),

        amount:
          Number(amount),

        status,

        payment_date:
          status ===
          "SUBMITTED"
            ? paymentDate ||
              new Date()
                .toISOString()
                .split("T")[0]
            : paymentDate ||
              null,

        transaction_id:
          transactionId.trim() ||
          null,

        remarks:
          remarks.trim() ||
          null,

        payment_mode:
          status ===
            "SUBMITTED" &&
          paymentMode ===
            "CASH"
            ? "CASH"
            : null,
      };

      const existingFee =
        existingFees &&
        existingFees.length > 0
          ? existingFees[0]
          : null;

      if (
        existingFee
      ) {
        const {
          error:
            updateError,
        } =
          await supabase
            .from("fees")
            .update(
              feeData
            )
            .eq(
              "id",
              existingFee.id
            );

        if (
          updateError
        ) {
          setError(
            updateError.message
          );
          return;
        }

        setMessage(
          status ===
            "SUBMITTED"
            ? "Cash payment saved successfully. Receipt is ready."
            : "Fee record updated successfully."
        );
      } else {
        const {
          error:
            insertError,
        } =
          await supabase
            .from("fees")
            .insert(
              feeData
            );

        if (
          insertError
        ) {
          setError(
            insertError.message
          );
          return;
        }

        setMessage(
          status ===
            "SUBMITTED"
            ? "Cash payment saved successfully. Receipt is ready."
            : "Fee record added successfully."
        );
      }

      setPaymentMode("");

      await loadData(true);
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Unable to save fee."
      );
    } finally {
      setSaving(false);
    }
  }

  async function deleteFee(
    id: number
  ) {
    const confirmed =
      window.confirm(
        "Are you sure you want to delete this fee record?"
      );

    if (!confirmed) {
      return;
    }

    setError("");
    setMessage("");

    const feeToDelete =
      fees.find(
        (fee) =>
          Number(fee.id) ===
          Number(id)
      );

    if (!feeToDelete) {
      setError(
        "Fee record not found."
      );
      return;
    }

    const currentTeacherId = Number(localStorage.getItem("attendance_teacher_id") || "0");
    if (!Number.isInteger(currentTeacherId) || currentTeacherId <= 0) {
      setError("Teacher ID was not found. Please login again as a teacher.");
      return;
    }

    if (currentTeacherId !== 1) {
      const { data: assignedData, error: assignedError } = await supabase.rpc("get_teacher_assigned_student_ids", { p_teacher_id: currentTeacherId });
      if (assignedError) {
        setError(assignedError.message);
        return;
      }
      const isAssigned = (assignedData || []).some((row: { student_id: number }) => Number(row.student_id) === Number(feeToDelete.student_id));
      if (!isAssigned) {
        setError("You can only delete fees for students assigned to you.");
        return;
      }
    }

    /*
     * IMPORTANT:
     *
     * Before deleting an automatic fee,
     * permanently remember its cycle in
     * this browser so the automatic generator
     * cannot recreate it.
     */
    if (
      isAutomaticFee(
        feeToDelete
      )
    ) {
      const key =
        getAutomaticFeeKey(
          Number(
            feeToDelete.student_id
          ),
          Number(
            feeToDelete.month
          ),
          Number(
            feeToDelete.year
          )
        );

      rememberDeletedAutomaticFee(
        key
      );
    }

    const {
      error:
        deleteError,
    } =
      await supabase
        .from("fees")
        .delete()
        .eq(
          "id",
          id
        );

    if (
      deleteError
    ) {
      /*
       * If DB deletion fails,
       * do not keep the block.
       */
      if (
        isAutomaticFee(
          feeToDelete
        )
      ) {
        try {
          const current =
            getDeletedAutomaticFeeKeys();

          const key =
            getAutomaticFeeKey(
              Number(
                feeToDelete.student_id
              ),
              Number(
                feeToDelete.month
              ),
              Number(
                feeToDelete.year
              )
            );

          const updated =
            current.filter(
              (item) =>
                item !== key
            );

          window.localStorage.setItem(
            DELETED_AUTO_FEE_STORAGE_KEY,
            JSON.stringify(
              updated
            )
          );
        } catch {
          // Ignore localStorage cleanup failure.
        }
      }

      setError(
        deleteError.message
      );

      return;
    }

    /*
     * Remove immediately from UI.
     */
    setFees(
      (current) =>
        current.filter(
          (fee) =>
            Number(
              fee.id
            ) !==
            Number(id)
        )
    );

    /*
     * Do NOT call the automatic generator
     * before showing success.
     *
     * The deletion memory prevents recreation.
     */
    setMessage(
      "Fee record deleted permanently."
    );

    /*
     * Refresh database only without
     * running automatic creation.
     */
    await loadData(false);
  }

  function getStudentName(
    id: number
  ) {
    const student =
      students.find(
        (item) =>
          Number(item.id) ===
          Number(id)
      );

    if (!student) {
      return "Unknown Student";
    }

    return (
      student.student_name ||
      student.student_username
    );
  }

  function getStudentUsername(
    id: number
  ) {
    const student =
      students.find(
        (item) =>
          Number(item.id) ===
          Number(id)
      );

    return (
      student?.student_username ||
      ""
    );
  }

  function getMonthName(
    monthNumber: number
  ) {
    return (
      months[
        monthNumber - 1
      ] ||
      `Month ${monthNumber}`
    );
  }

  function downloadReceipt(
    fee: Fee
  ) {
    const studentName =
      getStudentName(
        fee.student_id
      );

    const username =
      getStudentUsername(
        fee.student_id
      );

    const monthName =
      getMonthName(
        fee.month
      );

    const receiptNumber =
      `RA-${fee.year}-${String(
        fee.month
      ).padStart(
        2,
        "0"
      )}-${fee.id}`;

    const normalizedPaymentMode =
      String(
        fee.payment_mode ||
          ""
      ).toUpperCase();

    const paymentModeText =
      normalizedPaymentMode ===
      "ONLINE"
        ? "ONLINE"
        : normalizedPaymentMode ===
          "CASH"
        ? "CASH"
        : "";

    const receiptHTML = `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8" />
<title>RACER ACADEMY Fee Receipt</title>

<style>

body {
  font-family: Arial, Helvetica, sans-serif;
  background: #f1f5f9;
  margin: 0;
  padding: 30px;
}

.receipt {
  max-width: 760px;
  margin: auto;
  background: white;
  padding: 40px;
  border-radius: 18px;
  box-shadow: 0 8px 30px rgba(0,0,0,0.08);
}

.top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  border-bottom: 2px solid #111827;
  padding-bottom: 20px;
}

.academy {
  font-size: 30px;
  font-weight: 900;
  color: #111827;
}

.tagline {
  margin-top: 5px;
  color: #6b7280;
  font-size: 13px;
}

.receipt-title {
  text-align: right;
  font-size: 24px;
  font-weight: 800;
  color: #1d4ed8;
}

.receipt-number {
  text-align: right;
  margin-top: 6px;
  color: #6b7280;
  font-size: 13px;
}

.paid {
  margin: 30px 0;
  padding: 18px;
  text-align: center;
  border-radius: 12px;
  background: #dcfce7;
  color: #166534;
  font-size: 22px;
  font-weight: 800;
}

.section {
  margin-top: 25px;
}

.section-title {
  font-size: 16px;
  font-weight: 800;
  color: #111827;
  margin-bottom: 10px;
}

table {
  width: 100%;
  border-collapse: collapse;
}

td {
  padding: 12px;
  border-bottom: 1px solid #e5e7eb;
}

td:first-child {
  width: 40%;
  color: #64748b;
  font-weight: 700;
}

td:last-child {
  color: #111827;
  font-weight: 600;
}

.amount {
  font-size: 24px;
  font-weight: 900;
  color: #111827;
}

.footer {
  margin-top: 35px;
  padding-top: 20px;
  border-top: 1px solid #e5e7eb;
  text-align: center;
  color: #64748b;
  font-size: 12px;
}

.print-button {
  display: block;
  margin: 25px auto 0;
  background: #111827;
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 700;
}

@media print {

  body {
    background: white;
    padding: 0;
  }

  .receipt {
    box-shadow: none;
    border-radius: 0;
    max-width: none;
  }

  .print-button {
    display: none;
  }

}

</style>
</head>

<body>

<div class="receipt">

<div class="top">

<div>

<div class="academy">
RACER ACADEMY
</div>

<div class="tagline">
Learn  Grow  Race Ahead
</div>

</div>

<div>

<div class="receipt-title">
FEE RECEIPT
</div>

<div class="receipt-number">
Receipt No: ${receiptNumber}
</div>

</div>

</div>

<div class="paid">
 PAYMENT RECEIVED
</div>

<div class="section">

<div class="section-title">
Student Details
</div>

<table>

<tr>
<td>Student Name</td>
<td>${studentName}</td>
</tr>

<tr>
<td>Username</td>
<td>${username}</td>
</tr>

</table>

</div>

<div class="section">

<div class="section-title">
Fee Details
</div>

<table>

<tr>
<td>Fee Month</td>
<td>${monthName} ${fee.year}</td>
</tr>

<tr>
<td>Amount Paid</td>
<td class="amount">
${Number(
      fee.amount
    ).toLocaleString(
      "en-IN"
    )}
</td>
</tr>

<tr>
<td>Status</td>
<td>${fee.status}</td>
</tr>

<tr>
<td>Payment Mode</td>
<td>${paymentModeText}</td>
</tr>

<tr>
<td>Payment Date</td>
<td>${fee.payment_date || ""}</td>
</tr>

<tr>
<td>Transaction ID</td>
<td>${fee.transaction_id || ""}</td>
</tr>

<tr>
<td>Remarks</td>
<td>${fee.remarks || ""}</td>
</tr>

</table>

</div>

<div class="footer">

This is a computer-generated fee receipt.

<br />

RACER ACADEMY  Attendance & Fee Management

</div>

<button
class="print-button"
onclick="window.print()"
>
- Print / Save PDF
</button>

</div>

</body>
</html>
`;

    const receiptWindow =
      window.open(
        "",
        "_blank",
        "width=900,height=900"
      );

    if (!receiptWindow) {
      setError(
        "Please allow pop-ups to download the receipt."
      );
      return;
    }

    receiptWindow.document.open();

    receiptWindow.document.write(
      receiptHTML
    );

    receiptWindow.document.close();
  }

  const totalSubmitted =
    fees
      .filter(
        (fee) =>
          String(
            fee.status || ""
          ).toUpperCase() ===
          "SUBMITTED"
      )
      .reduce(
        (sum, fee) =>
          sum +
          Number(
            fee.amount || 0
          ),
        0
      );

  const totalPending =
    fees
      .filter(
        (fee) =>
          String(
            fee.status || ""
          ).toUpperCase() ===
          "PENDING"
      )
      .reduce(
        (sum, fee) =>
          sum +
          Number(
            fee.amount || 0
          ),
        0
      );

  const totalRefunded =
    fees
      .filter(
        (fee) =>
          String(
            fee.status || ""
          ).toUpperCase() ===
          "REFUNDED"
      )
      .reduce(
        (sum, fee) =>
          sum +
          Number(
            fee.amount || 0
          ),
        0
      );

  function editFeeRecord(fee: Fee) {
    setStudentId(String(fee.student_id));
    setMonth(String(fee.month));
    setYear(String(fee.year));
    setAmount(String(fee.amount ?? ""));
    setStatus(fee.status || "PENDING");
    setPaymentDate(fee.payment_date || "");
    setTransactionId(fee.transaction_id || "");
    setRemarks(fee.remarks || "");
    setPaymentMode(fee.payment_mode || "");
    window.setTimeout(() => document.getElementById("racer-fee-entry")?.scrollIntoView({ behavior: "smooth", block: "start" }), 0);
  }

  function viewFeeRecord(fee: Fee) {
    const studentName = getStudentName(fee.student_id);
    const username = getStudentUsername(fee.student_id);
    window.alert(`Student: ${studentName}\nUsername / ID: ${username}\nMonth: ${getMonthName(fee.month)} ${fee.year}\nAmount: ${Number(fee.amount || 0).toLocaleString("en-IN")}\nStatus: ${fee.status}\nPayment Mode: ${fee.payment_mode || "-"}\nPayment Date: ${fee.payment_date || "-"}\nTransaction ID: ${fee.transaction_id || "-"}\nRemarks: ${fee.remarks || "-"}`);
  }

  const paidVipFees = fees.filter((fee) => {
    const statusValue = String(fee.status || "").toUpperCase();
    return statusValue === "SUBMITTED" || statusValue === "PAID" || statusValue === "PAID ONLINE";
  });
  const pendingVipFees = fees.filter((fee) => String(fee.status || "").toUpperCase() === "PENDING");
  const vipCollectionTotal = paidVipFees.reduce((sum, fee) => sum + Number(fee.amount || 0), 0);
  const visibleVipFees = fees.filter((fee) => {
    const text = `${getStudentName(fee.student_id)} ${getStudentUsername(fee.student_id)} ${fee.month} ${fee.year}`.toLowerCase();
    const statusValue = String(fee.status || "").toUpperCase();
    const matchesSearch = !feeSearch.trim() || text.includes(feeSearch.trim().toLowerCase());
    const matchesFilter = feeFilter === "all" || (feeFilter === "paid" && (statusValue === "SUBMITTED" || statusValue === "PAID" || statusValue === "PAID ONLINE")) || (feeFilter === "pending" && statusValue === "PENDING");
    return matchesSearch && matchesFilter;
  });
  const feePageSize = 10;
  const feeTotalPages = Math.max(1, Math.ceil(visibleVipFees.length / feePageSize));
  const safeFeePage = Math.min(feePage, feeTotalPages);
  const feePageRows = visibleVipFees.slice((safeFeePage - 1) * feePageSize, safeFeePage * feePageSize);

  if (loading) {
    return (
      <main className="racer-vip-module-page racer-vip-fees-page">
        <div className="racer-vip-phone">
          <div className="racer-vip-loading-card"><div className="racer-vip-spinner" /><h2>Loading Fees Management...</h2><p>Please wait while fee records are loaded.</p></div>
        </div>
      </main>
    );
  }

  return (
    <main className="racer-vip-module-page racer-vip-fees-page">
      <div className="racer-vip-phone">

        {message && <div className={`racer-vip-message ${message.toLowerCase().includes("unable") || message.toLowerCase().includes("error") ? "is-error" : "is-success"}`}>{message}</div>}
        {error && <div className="racer-vip-message is-error">{error}</div>}

        <section className="racer-vip-page-heading">
          <div className="racer-vip-heading-icon"><Icon name="coins" /></div>
          <div className="racer-vip-heading-copy"><h1>FEES MANAGEMENT</h1><p>View and manage student fee records</p></div>
          <div className="racer-vip-date-tile"><span><Icon name="calendar" /></span><span><small>Date Range</small><strong>{new Date(Number(year), Number(month) - 1, 1).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })} - {new Date(Number(year), Number(month), 0).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}</strong></span></div>
        </section>

        <section className="racer-vip-fee-summary">
          <div className="fee-summary-card students"><span><Icon name="users" /></span><small>Total Students</small><b>{students.length}</b></div>
          <div className="fee-summary-card paid"><span><Icon name="check" /></span><small>Paid</small><b>{paidVipFees.length}</b></div>
          <div className="fee-summary-card pending"><span><Icon name="calendar" /></span><small>Pending</small><b>{pendingVipFees.length}</b></div>
          <div className="fee-summary-card collection"><span className="rupee-icon">Rs.</span><small>Collection</small><b>Rs. {vipCollectionTotal.toLocaleString("en-IN")}</b></div>
        </section>

        <details id="racer-fee-entry" className="racer-vip-fee-entry">
          <summary><span>Add / Update Fee</span><span>+</span></summary>
          <form onSubmit={saveFee} className="racer-vip-fee-form">
            <div className="racer-vip-fee-form-grid">
              <label><span>Student</span><select value={studentId} onChange={(e) => { const selectedId = e.target.value; setStudentId(selectedId); const selectedStudent = students.find((student) => String(student.id) === selectedId); if (selectedStudent) setAmount(String(getFeeAmount(selectedStudent))); }}><option value="">Select Student</option>{students.map((student) => <option key={student.id} value={student.id}>{student.student_name || student.student_username} ({student.student_username})</option>)}</select></label>
              <label><span>Month</span><select value={month} onChange={(e) => setMonth(e.target.value)}>{months.map((monthName, index) => <option key={monthName} value={index + 1}>{monthName}</option>)}</select></label>
              <label><span>Year</span><input type="number" value={year} onChange={(e) => setYear(e.target.value)} /></label>
              <label><span>Amount</span><input type="number" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} /></label>
              <label><span>Status</span><select value={status} onChange={(e) => { const nextStatus = e.target.value; setStatus(nextStatus); if (nextStatus !== "SUBMITTED") setPaymentMode(""); }}>{statuses.map((statusName) => <option key={statusName} value={statusName}>{statusName}</option>)}</select></label>
              <label><span>Payment Mode</span><select value={paymentMode} onChange={(e) => setPaymentMode(e.target.value)}><option value="">Select Payment Mode</option><option value="CASH">CASH</option></select></label>
              <label><span>Payment Date</span><input type="date" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} /></label>
              <label><span>Transaction ID</span><input type="text" value={transactionId} onChange={(e) => setTransactionId(e.target.value)} placeholder="Optional" /></label>
              <label className="wide"><span>Remarks</span><input type="text" value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="Optional" /></label>
            </div>
            <button type="submit" disabled={saving} className="racer-vip-save-fee"><Icon name="receipt" />{saving ? "Saving..." : "Save Fee"}</button>
          </form>
        </details>

        <section className="racer-vip-fee-history">
          <div className="racer-vip-history-toolbar"><div><h2>Fee History</h2><p>Complete student fee records</p></div><button type="button" className="racer-vip-refresh-fee" onClick={() => loadData(true)}>Refresh</button></div>
          <div className="racer-vip-search-wrap"><Icon name="search" /><input value={feeSearch} onChange={(e) => { setFeeSearch(e.target.value); setFeePage(1); }} placeholder="Search student by name or ID..." /></div>
          <div className="racer-vip-fee-filter-row">
            <button type="button" className={feeFilter === "all" ? "active" : ""} onClick={() => { setFeeFilter("all"); setFeePage(1); }}>All</button>
            <button type="button" className={feeFilter === "paid" ? "active" : ""} onClick={() => { setFeeFilter("paid"); setFeePage(1); }}>Paid</button>
            <button type="button" className={feeFilter === "pending" ? "active" : ""} onClick={() => { setFeeFilter("pending"); setFeePage(1); }}>Pending</button>
          </div>

          {visibleVipFees.length === 0 ? (
            <div className="racer-vip-empty">No fee records found.</div>
          ) : (
            <div className="racer-vip-fee-table-wrap">
              <div className="racer-vip-fee-grid header"><span>#</span><span>Student</span><span>Class</span><span>Fee</span><span>Paid</span><span>Due</span><span>Status</span><span>Action</span></div>
              {feePageRows.map((fee, index) => {
                const normalizedStatus = String(fee.status || "").toUpperCase();
                const isPaid = normalizedStatus === "SUBMITTED" || normalizedStatus === "PAID" || normalizedStatus === "PAID ONLINE";
                const amountValue = Number(fee.amount || 0);
                const paidValue = isPaid ? amountValue : 0;
                const dueValue = normalizedStatus === "PENDING" ? amountValue : 0;
                return (
                  <div className="racer-vip-fee-grid" key={fee.id}>
                    <span>{(safeFeePage - 1) * feePageSize + index + 1}</span>
                    <span className="fee-student"><strong>{getStudentName(fee.student_id)}</strong><small>{getStudentUsername(fee.student_id)} - {getMonthName(fee.month)} {fee.year}</small></span>
                    <span>{getStudentClass(students.find((student) => student.id === fee.student_id) || ({} as Student)) || "-"}</span>
                    <span>Rs. {amountValue.toLocaleString("en-IN")}</span>
                    <span className="money paid">Rs. {paidValue.toLocaleString("en-IN")}</span>
                    <span className="money due">Rs. {dueValue.toLocaleString("en-IN")}</span>
                    <span><StatusBadge status={fee.status} /></span>
                    <span className="fee-actions">
                      <button type="button" title="View" onClick={() => viewFeeRecord(fee)}><Icon name="eye" /></button>
                      <button type="button" title="Edit" onClick={() => editFeeRecord(fee)}><Icon name="edit" /></button>
                      {isPaid && <button type="button" title="Receipt" onClick={() => downloadReceipt(fee)}><Icon name="receipt" /></button>}
                      <button type="button" title="Delete" onClick={() => deleteFee(fee.id)}><Icon name="trash" /></button>
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          <div className="racer-vip-pagination"><button type="button" disabled={safeFeePage <= 1} onClick={() => setFeePage((page) => Math.max(1, page - 1))}><Icon name="chevron-left" /></button><span>Showing {visibleVipFees.length === 0 ? 0 : (safeFeePage - 1) * feePageSize + 1}-{Math.min(safeFeePage * feePageSize, visibleVipFees.length)} of {visibleVipFees.length} records</span><button type="button" disabled={safeFeePage >= feeTotalPages} onClick={() => setFeePage((page) => Math.min(feeTotalPages, page + 1))}><Icon name="chevron-right" /></button></div>
        </section>

        <div className="racer-vip-bottom-nav"><button type="button" onClick={() => window.history.back()}><Icon name="back" />Back</button><div className="racer-vip-footer-brand"><strong>RACER ACADEMY</strong><small>TEACHER CONTROL CENTER</small></div><button type="button" onClick={() => { window.location.href = "/teacher"; }}><Icon name="home" />Dashboard</button></div>
      </div>
    </main>
  );
}

function Icon({ name }: { name: string }) {
  const common = { width: 18, height: 18, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true };
  switch (name) {
    case "menu": return <svg {...common}><path d="M4 6h16M4 12h16M4 18h16" /></svg>;
    case "bell": return <svg {...common}><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" /><path d="M10 21h4" /></svg>;
    case "calendar": return <svg {...common}><rect x="3" y="4" width="18" height="17" rx="2" /><path d="M16 2v4M8 2v4M3 9h18" /></svg>;
    case "coins": return <svg {...common}><circle cx="8" cy="8" r="4" /><path d="M8 4h8a4 4 0 0 1 0 8h-1M8 12v4a4 4 0 0 0 4 4h4a4 4 0 0 0 0-8h-4" /></svg>;
    case "users": return <svg {...common}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></svg>;
    case "search": return <svg {...common}><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></svg>;
    case "download": return <svg {...common}><path d="M12 3v12" /><path d="m7 10 5 5 5-5" /><path d="M5 21h14" /></svg>;
    case "eye": return <svg {...common}><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6Z" /><circle cx="12" cy="12" r="2.5" /></svg>;
    case "edit": return <svg {...common}><path d="m4 20 4.2-1 9.7-9.7a2 2 0 0 0-2.8-2.8L5.4 16.2 4 20Z" /><path d="m13.5 7.5 3 3" /></svg>;
    case "trash": return <svg {...common}><path d="M4 7h16M10 11v6M14 11v6" /><path d="M6 7l1 14h10l1-14M9 7l1-3h4l1 3" /></svg>;
    case "receipt": return <svg {...common}><path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3Z" /><path d="M9 8h6M9 12h6M9 16h4" /></svg>;
    case "back": return <svg {...common}><path d="M19 12H5" /><path d="m12 19-7-7 7-7" /></svg>;
    case "home": return <svg {...common}><path d="m3 11 9-8 9 8" /><path d="M5 10v10h14V10M9 20v-6h6v6" /></svg>;
    case "chevron-left": return <svg {...common}><path d="m14 6-6 6 6 6" /></svg>;
    case "chevron-right": return <svg {...common}><path d="m10 6 6 6-6 6" /></svg>;
    case "check": return <svg {...common}><path d="m5 12 4 4L19 6" /></svg>;
    default: return <svg {...common}><circle cx="12" cy="12" r="9" /></svg>;
  }
}
function SummaryCard({
  title,
  amount,
  icon,
  background,
}: {
  title: string;
  amount: number;
  icon: string;
  background: string;
}) {
  return (
    <div
      style={{
        ...styles.summaryCard,
        background,
      }}
    >

      <div
        style={
          styles.summaryIcon
        }
      >
        {icon}
      </div>

      <div
        style={
          styles.summaryTitle
        }
      >
        {title}
      </div>

      <div
        style={
          styles.summaryAmount
        }
      >
        {title ===
        "Total Records"
          ? amount
          : `${amount.toLocaleString(
              "en-IN"
            )}`}
      </div>

    </div>
  );
}

function StatusBadge({
  status,
}: {
  status: string;
}) {
  const normalized =
    String(
      status || ""
    ).toUpperCase();

  const statusStyles: Record<
    string,
    React.CSSProperties
  > = {
    SUBMITTED: {
      background:
        "#dcfce7",
      color:
        "#166534",
    },

    PENDING: {
      background:
        "#fef3c7",
      color:
        "#92400e",
    },

    REFUNDED: {
      background:
        "#ede9fe",
      color:
        "#5b21b6",
    },

    CANCELLED: {
      background:
        "#fee2e2",
      color:
        "#991b1b",
    },

    PAID: {
      background:
        "#dcfce7",
      color:
        "#166534",
    },

    "PAID ONLINE": {
      background:
        "#dcfce7",
      color:
        "#166534",
    },
  };

  return (
    <span
      style={{
        ...styles.badge,
        ...(statusStyles[
          normalized
        ] ||
          statusStyles.PENDING),
      }}
    >

      {normalized ===
        "SUBMITTED" &&
        " "}

      {normalized ===
        "PENDING" &&
        " "}

      {normalized ===
        "REFUNDED" &&
        " "}

      {normalized ===
        "CANCELLED" &&
        " -  "}

      {(normalized ===
        "PAID" ||
        normalized ===
          "PAID ONLINE") &&
        " "}

      {normalized}

    </span>
  );
}

const styles: Record<
  string,
  React.CSSProperties
> = {
  page: {
    minHeight:
      "100vh",
    background:
      "linear-gradient(135deg,#eff6ff,#f8fafc)",
    padding:
      "25px 15px",
    fontFamily:
      "Arial, Helvetica, sans-serif",
    boxSizing:
      "border-box",
  },

  container: {
    width:
      "100%",
    maxWidth:
      "1300px",
    margin:
      "0 auto",
  },

  header: {
    background:
      "white",
    padding:
      "24px",
    borderRadius:
      "18px",
    display:
      "flex",
    justifyContent:
      "space-between",
    alignItems:
      "center",
    gap:
      "15px",
    marginBottom:
      "20px",
    boxShadow:
      "0 8px 25px rgba(15,23,42,0.08)",
  },

  title: {
    margin:
      0,
    color:
      "#172554",
    fontSize:
      "30px",
    fontWeight:
      800,
  },

  subtitle: {
    margin:
      "6px 0 0",
    color:
      "#64748b",
    fontSize:
      "14px",
  },

  backButton: {
    textDecoration:
      "none",
    background:
      "#1e3a8a",
    color:
      "white",
    padding:
      "12px 18px",
    borderRadius:
      "10px",
    fontWeight:
      700,
    whiteSpace:
      "nowrap",
  },

  summaryGrid: {
    display:
      "grid",
    gridTemplateColumns:
      "repeat(auto-fit,minmax(210px,1fr))",
    gap:
      "18px",
    marginBottom:
      "20px",
  },

  summaryCard: {
    color:
      "white",
    padding:
      "22px",
    borderRadius:
      "18px",
    boxShadow:
      "0 8px 20px rgba(15,23,42,0.12)",
  },

  summaryIcon: {
    fontSize:
      "28px",
  },

  summaryTitle: {
    marginTop:
      "10px",
    fontSize:
      "14px",
    opacity:
      0.9,
  },

  summaryAmount: {
    fontSize:
      "28px",
    fontWeight:
      800,
    marginTop:
      "5px",
  },

  card: {
    background:
      "white",
    borderRadius:
      "18px",
    padding:
      "25px",
    marginBottom:
      "20px",
    boxShadow:
      "0 8px 25px rgba(15,23,42,0.08)",
  },

  sectionTitle: {
    margin:
      0,
    color:
      "#172554",
    fontSize:
      "22px",
  },

  formGrid: {
    display:
      "grid",
    gridTemplateColumns:
      "repeat(auto-fit,minmax(220px,1fr))",
    gap:
      "18px",
    marginTop:
      "20px",
  },

  label: {
    display:
      "block",
    marginBottom:
      "7px",
    color:
      "#334155",
    fontWeight:
      700,
    fontSize:
      "14px",
  },

  input: {
    width:
      "100%",
    boxSizing:
      "border-box",
    padding:
      "12px",
    border:
      "1px solid #cbd5e1",
    borderRadius:
      "10px",
    fontSize:
      "15px",
    color:
      "#111827",
    background:
      "white",
  },

  saveButton: {
    marginTop:
      "22px",
    border:
      "none",
    background:
      "linear-gradient(135deg,#2563eb,#4f46e5)",
    color:
      "white",
    padding:
      "13px 24px",
    borderRadius:
      "10px",
    fontSize:
      "16px",
    fontWeight:
      700,
    cursor:
      "pointer",
  },

  success: {
    marginTop:
      "18px",
    background:
      "#dcfce7",
    color:
      "#166534",
    padding:
      "12px",
    borderRadius:
      "10px",
    fontWeight:
      600,
  },

  error: {
    marginTop:
      "18px",
    background:
      "#fee2e2",
    color:
      "#991b1b",
    padding:
      "12px",
    borderRadius:
      "10px",
    fontWeight:
      600,
  },

  historyHeader: {
    display:
      "flex",
    alignItems:
      "center",
    justifyContent:
      "space-between",
    gap:
      "15px",
    marginBottom:
      "20px",
  },

  refreshButton: {
    border:
      "none",
    background:
      "#2563eb",
    color:
      "white",
    padding:
      "11px 17px",
    borderRadius:
      "10px",
    fontWeight:
      700,
    cursor:
      "pointer",
  },

  tableWrapper: {
    width:
      "100%",
    overflowX:
      "hidden",
  },

  table: {
    width:
      "100%",
    minWidth:
      "0",
    tableLayout:
      "fixed",
    borderCollapse:
      "collapse",
  },

  th: {
    overflowWrap: "anywhere",
    whiteSpace: "normal",
    background:
      "#eff6ff",
    color:
      "#1e3a8a",
    padding:
      "13px",
    textAlign:
      "left",
    borderBottom:
      "2px solid #dbeafe",
    fontSize:
      "13px",
  },

  td: {
    overflowWrap: "anywhere",
    wordBreak: "break-word",
    whiteSpace: "normal",
    padding:
      "13px",
    borderBottom:
      "1px solid #e2e8f0",
    color:
      "#334155",
    fontSize:
      "14px",
    verticalAlign:
      "middle",
  },

  username: {
    marginTop:
      "4px",
    color:
      "#64748b",
    fontSize:
      "12px",
  },

  badge: {
    display:
      "inline-block",
    padding:
      "7px 11px",
    borderRadius:
      "999px",
    fontWeight:
      700,
    fontSize:
      "12px",
    whiteSpace:
      "nowrap",
  },

  paymentModeBadge: {
    display:
      "inline-block",
    padding:
      "7px 11px",
    borderRadius:
      "999px",
    fontWeight:
      700,
    fontSize:
      "12px",
    whiteSpace:
      "nowrap",
  },

  notSelected: {
    color:
      "#94a3b8",
    fontSize:
      "13px",
  },

  receiptButton: {
    border:
      "none",
    background:
      "linear-gradient(135deg,#059669,#16a34a)",
    color:
      "white",
    padding:
      "9px 13px",
    borderRadius:
      "8px",
    cursor:
      "pointer",
    fontWeight:
      700,
    whiteSpace:
      "nowrap",
  },

  notAvailable: {
    color:
      "#94a3b8",
    fontSize:
      "11px",
    display:
      "inline-block",
    maxWidth:
      "100px",
  },

  deleteButton: {
    border:
      "none",
    background:
      "#dc2626",
    color:
      "white",
    padding:
      "8px 11px",
    borderRadius:
      "8px",
    cursor:
      "pointer",
    fontWeight:
      700,
  },

  empty: {
    textAlign:
      "center",
    padding:
      "40px",
    color:
      "#64748b",
  },

  loading: {
    background:
      "white",
    maxWidth:
      "450px",
    margin:
      "100px auto",
    padding:
      "40px",
    borderRadius:
      "18px",
    textAlign:
      "center",
    fontSize:
      "18px",
    fontWeight:
      700,
  },
};






