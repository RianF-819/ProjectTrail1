/**
 * bikePhysics.js - Fisika Motor Trail 2 Roda dengan Raycast Suspension
 * Menggunakan Cannon-es untuk rigid body dan raycast suspension.
 * Fitur: idle balance, lean control saat belok, gear range, air whip/pitch, dan recovery.
 */

import * as CANNON from 'cannon-es';

export class Bike {
  constructor(world) {
    this.world = world;
    this.chassisBody = null;

    // Paired rays per wheel give the arcade bike enough lateral support at low speed.
    this.suspPoints = [
      { local: new CANNON.Vec3(0.24, -0.24, 0.95), name: 'frontRight' },
      { local: new CANNON.Vec3(-0.24, -0.24, 0.95), name: 'frontLeft' },
      { local: new CANNON.Vec3(0.24, -0.24, -0.95), name: 'rearRight' },
      { local: new CANNON.Vec3(-0.24, -0.24, -0.95), name: 'rearLeft' },
    ];

    this.suspensionRestLength = 0.48;
    this.wheelRadius = 0.39;
    this.suspensionStiffness = 2800;
    this.suspensionDamping = 430;
    this.maxSuspensionForce = 6500;

    this.speed = 0;
    this.rpm = 0;
    this.gear = 0;
    this.gearRange = 'HIGH';
    this.leanAngle = 0;
    this.hasGroundContact = true;
    this.contactCount = 4;
    this.frontContactCount = 0;
    this.rearContactCount = 0;
    this.isDrifting = false;
    this.maxForce = 1800;
    this.maxBrakeForce = 2200;
    this.maxSteer = 0.6;
    this.maxLean = 0.68;
    this.maxSpeed = 36;

    this.initPhysics();
  }

  initPhysics() {
    const mass = 300;
    const half = new CANNON.Vec3(0.38, 0.3, 0.9);
    const shape = new CANNON.Box(half);

    this.chassisBody = new CANNON.Body({
      mass,
      shape,
      linearDamping: 0.08,
      angularDamping: 0.35,
      allowSleep: false,
    });
    // Collision groups: 1 = Bike Chassis, 2 = Terrain/Ground
    this.chassisBody.collisionFilterGroup = 1;
    this.chassisBody.collisionFilterMask = 2;

    this.chassisBody.position.set(0, 3, 0);
    this.chassisBody.quaternion.set(0, 0, 0, 1);
    this.world.addBody(this.chassisBody);
  }

  setGearRange(range) {
    this.gearRange = range;
  }

  setGear(gear) {
    this.gear = gear;
  }

  recover(targetY = null) {
    const p = this.chassisBody.position;
    const y = targetY !== null ? targetY : p.y + 2.2;
    this.chassisBody.position.set(p.x, y, p.z);
    this.chassisBody.velocity.set(0, 0, 0);
    this.chassisBody.angularVelocity.set(0, 0, 0);
    this.chassisBody.quaternion.set(0, 0, 0, 1);
    this.chassisBody.wakeUp();
  }

  update(dt, input, terrainZones) {
    const chassis = this.chassisBody;
    const quat = chassis.quaternion;

    const worldUp = new CANNON.Vec3(0, 1, 0);
    quat.vmult(worldUp, worldUp);

    const worldFwd = new CANNON.Vec3(0, 0, 1);
    quat.vmult(worldFwd, worldFwd);

    const worldRight = new CANNON.Vec3(1, 0, 0);
    quat.vmult(worldRight, worldRight);

    const v = chassis.velocity;
    const speedMs = Math.sqrt(v.x * v.x + v.z * v.z);
    this.speed = speedMs * 3.6;

    const gearRatio = this.gear === 0 ? 1 : (this.gear * 0.75 + 0.4);
    const rangeMult = this.gearRange === 'LOW' ? 1.35 : 1.0;
    this.rpm = Math.min(9500, speedMs * 45 * gearRatio * rangeMult);

    const throttle = input.throttle || 0;
    const brake = Math.max(0, -throttle);
    const steer = input.steer || 0;
    const pitch = input.pitch || 0;
    const handbrake = input.handbrake || false;

    let contactCount = 0;
    let groundFriction = 1.0;
    let frictionTotal = 0;
    let frontContactCount = 0;
    let rearContactCount = 0;
    let frontGroundX = 0;
    let frontGroundY = 0;
    let frontGroundZ = 0;
    let rearGroundX = 0;
    let rearGroundY = 0;
    let rearGroundZ = 0;

    const maxRayDist = this.suspensionRestLength + this.wheelRadius;

    // Raycast suspension simulation
    for (const sp of this.suspPoints) {
      const lp = sp.local;
      const wp = new CANNON.Vec3();
      quat.vmult(lp, wp);
      const rayStart = chassis.position.vadd(wp);

      const ld = new CANNON.Vec3(0, -1, 0);
      const wd = new CANNON.Vec3();
      quat.vmult(ld, wd);

      const from = rayStart.clone();
      const to = new CANNON.Vec3(
        rayStart.x + wd.x * maxRayDist,
        rayStart.y + wd.y * maxRayDist,
        rayStart.z + wd.z * maxRayDist
      );

      const rayResult = new CANNON.RaycastResult();
      // collisionFilterMask: 2 targets ONLY the terrain (group 2), avoiding chassis self-hit
      this.world.raycastClosest(from, to, {
        collisionFilterMask: 2,
        skipBackfaces: false,
      }, rayResult);

      if (rayResult.hasHit) {
        contactCount++;
        const hitPoint = rayResult.hitPointWorld;
        if (sp.name.includes('front')) {
          frontContactCount++;
          frontGroundX += hitPoint.x;
          frontGroundY += hitPoint.y;
          frontGroundZ += hitPoint.z;
        } else {
          rearContactCount++;
          rearGroundX += hitPoint.x;
          rearGroundY += hitPoint.y;
          rearGroundZ += hitPoint.z;
        }
        const dist = rayResult.distance;
        let pointFriction = 1.0;
        let pointSuspMult = 1.0;

        if (terrainZones && terrainZones.length) {
          for (const zone of terrainZones) {
            let isInsideZone = false;
            if (zone.start && zone.end && Number.isFinite(zone.halfWidth)) {
              const segmentX = zone.end.x - zone.start.x;
              const segmentZ = zone.end.z - zone.start.z;
              const segmentLengthSq = segmentX * segmentX + segmentZ * segmentZ;
              const t = Math.max(0, Math.min(1,
                ((hitPoint.x - zone.start.x) * segmentX +
                  (hitPoint.z - zone.start.z) * segmentZ) / segmentLengthSq));
              const nearestX = zone.start.x + segmentX * t;
              const nearestZ = zone.start.z + segmentZ * t;
              isInsideZone = (hitPoint.x - nearestX) ** 2 +
                (hitPoint.z - nearestZ) ** 2 < zone.halfWidth * zone.halfWidth;
            } else {
              const dx = hitPoint.x - zone.cx;
              const dz = hitPoint.z - zone.cz;
              isInsideZone = dx * dx + dz * dz < zone.radius * zone.radius;
            }
            if (isInsideZone) {
              pointFriction = zone.friction;
              pointSuspMult = zone.suspMult || 1.0;
            }
          }
        }
        frictionTotal += pointFriction;

        const compression = maxRayDist - dist;
        if (compression > 0.01) {
          let force = compression * this.suspensionStiffness * pointSuspMult;
          const velAtPoint = new CANNON.Vec3();
          chassis.getVelocityAtWorldPoint(rayStart, velAtPoint);
          const velAlong = velAtPoint.dot(wd);
          // Positive velAlong means compressing downward: ADD damping force to resist
          force += velAlong * this.suspensionDamping;
          force = Math.max(0, Math.min(force, this.maxSuspensionForce));

          const fVec = new CANNON.Vec3(-wd.x * force, -wd.y * force, -wd.z * force);
          chassis.applyForce(fVec, wp);
        }
      }
    }

    this.contactCount = contactCount;
    this.hasGroundContact = contactCount > 0;
    this.frontContactCount = frontContactCount;
    this.rearContactCount = rearContactCount;
    if (contactCount > 0) groundFriction = frictionTotal / contactCount;
    this.isDrifting = handbrake && contactCount > 0 &&
      speedMs > 4 && Math.abs(steer) > 0.1;

    // Tenaga penggerak roda belakang (KickMX-style: responsif di darat & udara)
    const rearPoints = this.suspPoints.filter(p => p.name.includes('rear'));
    const forwardSpeed = v.dot(worldFwd);
    const driveScale = Math.max(0, 1 - Math.max(0, throttle * forwardSpeed) / this.maxSpeed);
    const driveForce = throttle * this.maxForce * rangeMult * groundFriction * driveScale;
    const forcePerWheel = driveForce / rearPoints.length;

    // Terapkan dorong ke depan walau di udara (arcade feel), lebih kuat di tanah
    const airMult = contactCount > 0 ? 1.0 : 0.35;
    if (Math.abs(throttle) > 0.01) {
      for (const sp of rearPoints) {
        const lp = sp.local;
        const wp = new CANNON.Vec3();
        quat.vmult(lp, wp);
        const fVec = new CANNON.Vec3(
          worldFwd.x * forcePerWheel * airMult,
          worldFwd.y * forcePerWheel * airMult,
          worldFwd.z * forcePerWheel * airMult
        );
        chassis.applyForce(fVec, wp);
      }
    }

    // Pengereman
    const brakeForce = brake * this.maxBrakeForce * groundFriction;
    if (brakeForce > 0 && speedMs > 0.1 && contactCount > 0) {
      const brakeForceVector = new CANNON.Vec3(
        -v.x * brakeForce / speedMs,
        0,
        -v.z * brakeForce / speedMs
      );
      chassis.applyForce(brakeForceVector, new CANNON.Vec3(0, 0, 0));
    }
    if (handbrake && speedMs > 0.1 && contactCount > 0) {
      const horizontalForwardLength = Math.max(0.001, Math.hypot(worldFwd.x, worldFwd.z));
      const rearBrakeForce = this.maxBrakeForce * 0.18 * groundFriction;
      const rearBrakeVector = new CANNON.Vec3(
        -worldFwd.x / horizontalForwardLength * rearBrakeForce,
        0,
        -worldFwd.z / horizontalForwardLength * rearBrakeForce
      );
      const rearOffset = new CANNON.Vec3();
      quat.vmult(new CANNON.Vec3(0, 0, -0.75), rearOffset);
      chassis.applyForce(rearBrakeVector, rearOffset);
    }

    // Gesekan lateral (grip samping agar ban tidak tergelincir murni ke samping)
    if (contactCount > 0) {
      const lateralVel = v.dot(worldRight);
      const gripLimit = chassis.mass * 9.81 * (handbrake ? 0.22 : 0.82) * groundFriction;
      const lateralGripForce = -Math.sign(lateralVel) *
        Math.min(Math.abs(lateralVel) * 1800, gripLimit);
      chassis.applyForce(new CANNON.Vec3(
        worldRight.x * lateralGripForce,
        0,
        worldRight.z * lateralGripForce
      ), new CANNON.Vec3(0, 0, 0));
    }

    // Steering di atas tanah
    let targetYawRate = 0;
    if (contactCount > 0) {
      const steerResponse = Math.min(speedMs / 0.75, 1);
      const turnRateLimit = 9.81 * Math.tan(this.maxLean) / Math.max(speedMs, 1);
      const turnRate = 1.15 / (1 + speedMs * 0.05);
      // The chase camera faces +Z, so screen-right is world -X.
      targetYawRate = -steer * Math.min(turnRate, turnRateLimit) * steerResponse;
      const yawRateError = targetYawRate - chassis.angularVelocity.y;
      const steerTorque = Math.max(-180, Math.min(180, yawRateError * chassis.inertia.y * 4));
      const driftYawTorque = this.isDrifting
        ? -steer * Math.min(150, speedMs * 10)
        : 0;
      chassis.applyTorque(new CANNON.Vec3(0, steerTorque + driftYawTorque, 0));
    }

    // Kemiringan motor (lean) & stabilitas tegak
    const verticalProjection = new CANNON.Vec3(0, 1, 0);
    verticalProjection.vsub(
      worldFwd.scale(verticalProjection.dot(worldFwd)),
      verticalProjection
    );
    if (verticalProjection.lengthSquared() > 1e-6) verticalProjection.normalize();
    const rollCross = verticalProjection.cross(worldUp);
    const currentRoll = Math.atan2(
      worldFwd.dot(rollCross),
      verticalProjection.dot(worldUp)
    );
    this.leanAngle = currentRoll;
    const rollRate = chassis.angularVelocity.dot(worldFwd);

    if (contactCount > 0) {
      const targetLean = -Math.atan2(speedMs * targetYawRate, 9.81);
      const leanErr = targetLean - currentRoll;
      const balanceFactor = 1 - Math.min(speedMs / 8, 1);
      const rollStiffness = 1050 + balanceFactor * 500;
      const rollDamping = 360 + balanceFactor * 180;
      const leanTorque = Math.max(-2000, Math.min(2000,
        leanErr * rollStiffness - rollRate * rollDamping));
      chassis.applyTorque(new CANNON.Vec3(
        worldFwd.x * leanTorque,
        worldFwd.y * leanTorque,
        worldFwd.z * leanTorque
      ));

      const horizontalForwardLength = Math.hypot(worldFwd.x, worldFwd.z);
      const currentPitch = Math.atan2(worldFwd.y, horizontalForwardLength);
      const pitchRate = chassis.angularVelocity.dot(worldRight);
      if (frontContactCount > 0 && rearContactCount > 0) {
        const forwardX = worldFwd.x / Math.max(horizontalForwardLength, 0.001);
        const forwardZ = worldFwd.z / Math.max(horizontalForwardLength, 0.001);
        const frontX = frontGroundX / frontContactCount;
        const frontY = frontGroundY / frontContactCount;
        const frontZ = frontGroundZ / frontContactCount;
        const rearX = rearGroundX / rearContactCount;
        const rearY = rearGroundY / rearContactCount;
        const rearZ = rearGroundZ / rearContactCount;
        const wheelbaseProjection = Math.max(0.8,
          (frontX - rearX) * forwardX + (frontZ - rearZ) * forwardZ);
        const surfacePitch = Math.max(-0.65, Math.min(0.65,
          Math.atan2(frontY - rearY, wheelbaseProjection)));
        const pitchTorque = Math.max(-1200, Math.min(1200,
          (currentPitch - surfacePitch) * 800 - pitchRate * 360));
        chassis.applyTorque(new CANNON.Vec3(
          worldRight.x * pitchTorque,
          worldRight.y * pitchTorque,
          worldRight.z * pitchTorque
        ));
      } else {
        const pitchDampingTorque = Math.max(-900, Math.min(900, -pitchRate * 450));
        chassis.applyTorque(new CANNON.Vec3(
          worldRight.x * pitchDampingTorque,
          worldRight.y * pitchDampingTorque,
          worldRight.z * pitchDampingTorque
        ));
      }
    } else {
      const supportResult = new CANNON.RaycastResult();
      const supportFrom = chassis.position.clone();
      const supportTo = supportFrom.vadd(new CANNON.Vec3(0, -1.8, 0));
      this.world.raycastClosest(supportFrom, supportTo, {
        collisionFilterMask: 2,
        skipBackfaces: false,
      }, supportResult);

      if (speedMs < 3 && supportResult.hasHit && supportResult.distance < 1.65) {
        const recoveryTorque = Math.max(-1600, Math.min(1600, -currentRoll * 1150 - rollRate * 150));
        chassis.applyTorque(new CANNON.Vec3(
          worldFwd.x * recoveryTorque,
          worldFwd.y * recoveryTorque,
          worldFwd.z * recoveryTorque
        ));
      }

      // In-air pitch control holds a limited attitude and damps spin between inputs.
      const currentPitch = Math.atan2(worldFwd.y, Math.hypot(worldFwd.x, worldFwd.z));
      const pitchRate = chassis.angularVelocity.dot(worldRight);
      const targetAirPitch = pitch * 0.28;
      const pitchTorque = Math.max(-350, Math.min(350,
        (currentPitch - targetAirPitch) * 70 - pitchRate * 180));
      chassis.applyTorque(new CANNON.Vec3(
        worldRight.x * pitchTorque,
        worldRight.y * pitchTorque,
        worldRight.z * pitchTorque
      ));

      // 2. Air Whip / Roll (hold a limited lean angle instead of accumulating spins)
      const targetAirRoll = steer * this.maxLean * 0.75;
      const airRollTorque = Math.max(-300, Math.min(300,
        (targetAirRoll - currentRoll) * 100 - rollRate * 140));
      chassis.applyTorque(new CANNON.Vec3(
        worldFwd.x * airRollTorque,
        worldFwd.y * airRollTorque,
        worldFwd.z * airRollTorque
      ));
    }
  }
}
