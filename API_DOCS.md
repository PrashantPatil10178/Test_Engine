# MHT-CET Exam Engine API Documentation

**Base URL**: `https://api.mhtcet.app`

This API powers the MHT-CET Exam Engine, providing endpoints for browsing syllabus content (standard/subject/chapter hierarchy) and executing full CBT (Computer Based Test) simulations with strict timer and weightage logic.

---

## 📚 1. Syllabus & Content

### **List Subjects**

Get all subjects, properly ordered and grouped by standard (11th/12th).

- **GET** `/subjects`
- **Query Params**:
  - `standard` (Optional): "STD_11" or "STD_12"
- **Response**:

```json
{
  "success": true,
  "data": [
    { "id": "uuid...", "code": "PHYS", "standardId": "..." },
    { "id": "uuid...", "code": "MATHS_1", "standardId": "..." }
  ]
}
```

### **List Chapters**

Get detailed chapter list for a specific subject.

- **GET** `/chapters`
- **Query Params**:
  - `subjectId` (Required): UUID of the subject
- **Response**:

```json
{
  "success": true,
  "data": [
    { "id": "uuid...", "name": "Rotational Dynamics", "order": 1 },
    { "id": "uuid...", "name": "Mechanical Properties of Fluids", "order": 2 }
  ]
}
```

### **List Questions**

Fetch questions with filtering. (Note: Correct answer is hidden if implemented strictly, but admin routes may show it).

- **GET** `/questions`
- **Query Params**:
  - `chapterId` (Optional): Filter by chapter
  - `limit` (Default: 20)
  - `offset` (Default: 0)
  - `difficulty`: "EASY", "MEDIUM", "HARD"
- **Response**:

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid...",
      "questionText": "...",
      "options": [{ "id": "...", "optionText": "...", "order": 1 }]
    }
  ]
}
```

---

## 📝 2. Test Engine (Exam Simulation)

### **Generate Test Paper**

Creates a new unique question paper based on MHT-CET weightage rules (80% Class 12, 20% Class 11).

- **POST** `/tests/create`
- **Body**:

```json
{
  "type": "PCM" // or "PCB"
}
```

- **Response**:

```json
{
  "success": true,
  "data": {
    "testId": "uuid-of-generated-test"
  }
}
```

### **Generate Subject-Wise Test**

Creates a random test for a specific subject (e.g., Physics).

- **POST** `/tests/create/subject`
- **Body**:

```json
{
  "subjectId": "uuid...",
  "count": 20, // Optional, default 20
  "time": 1800 // Optional, default 1 min/question (in seconds)
}
```

- **Response**:

```json
{
  "success": true,
  "data": { "testId": "uuid..." }
}
```

### **Generate Chapter-Wise Test**

Creates a random test for a specific chapter.

- **POST** `/tests/create/chapter`
- **Body**:

```json
{
  "chapterId": "uuid...",
  "count": 10, // Optional, default 10
  "time": 600 // Optional
}
```

- **Response**:

```json
{
  "success": true,
  "data": { "testId": "uuid..." }
}
```

### **Start Test Attempt**

Starts a timer for a user on a specific test.

- **POST** `/tests/start`
- **Body**:

```json
{
  "testId": "uuid-from-create-step",
  "userId": "unique-user-id"
}
```

- **Response**:

```json
{
  "success": true,
  "data": {
    "attemptId": "uuid-of-attempt"
  }
}
```

### **Get Test State (Heartbeat)**

**Critical Endpoint**. Call this on page load and periodically. It returns the current running section, the questions (without answers), and the **Server Authoritative Timer**.

- **GET** `/tests/state/:attemptId`
- **Response**:

```json
{
  "success": true,
  "data": {
    "status": "IN_PROGRESS",
    "sectionIndex": 0,
    "startTime": "2026-01-20T10:00:00.000Z", // Absolute start time
    "serverTime": "2026-01-20T10:15:00.000Z", // Current server time (use for drift calc)
    "timeLeft": 75.0, // Minutes remaining in current section
    "questions": [
      {
        "id": "q1",
        "text": "Question text...",
        "options": [{ "id": "o1", "text": "Option A", "order": 1 }]
      }
      // ... 50-100 questions
    ],
    "responses": {
      "q1_uuid": 2, // saved answer option order
      "q5_uuid": 4
    }
  }
}
```

### **Submit Response (Single)**

Save an answer for a single question (Auto-save).

- **POST** `/tests/response`
- **Body**:

```json
{
  "attemptId": "uuid-of-attempt",
  "questionId": "uuid-of-question",
  "optionOrder": 2 // 1, 2, 3, or 4
}
```

- **Response**: `{"success": true}`

### **Bulk Sync (Reconnect)**

Use this if the user comes back online to sync multiple answers.

- **POST** `/tests/sync`
- **Body**:

```json
{
  "attemptId": "uuid-of-attempt",
  "answers": {
    "q1_uuid": 2,
    "q2_uuid": 3
  }
}
```

- **Response**: `{"success": true, "data": { ...fresh_state }}`

### **Submit Section / Finish Test**

Force submits the current section. If it's the last section, the test completes.

- **POST** `/tests/submit-section`
- **Body**:

```json
{
  "attemptId": "uuid-of-attempt"
}
```

- **Response**: `{"success": true, "message": "Section submitted"}`

---

## 🔒 Error Handling

All error responses follow this format:

```json
{
  "success": false,
  "message": "Error description",
  "error": { ...details }
}
```
