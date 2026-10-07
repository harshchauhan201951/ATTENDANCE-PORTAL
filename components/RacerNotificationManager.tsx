"use client";

import { useEffect, useRef, useState } from "react";

import { Capacitor } from "@capacitor/core";

import { PushNotifications } from "@capacitor/push-notifications";

const SOUND = "/racer-notification.mp3";

