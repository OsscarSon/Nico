using System;

// Library-only fixed-step demonstration for .NET or a Unity Edit Mode test.
// The MonoBehaviour adapter can read inputs in Update and integrate a Rigidbody
// in FixedUpdate; this class demonstrates an independent simulation clock.
public sealed class MotionKernel
{
    private const int StepMilliseconds = 20;
    private int pending;
    public int SimulatedMilliseconds { get; private set; }
    public double Position => SimulatedMilliseconds * 0.006;

    public int Advance(int elapsedMilliseconds)
    {
        if (elapsedMilliseconds < 0 || elapsedMilliseconds > 1000)
            throw new ArgumentOutOfRangeException(nameof(elapsedMilliseconds));

        pending = checked(pending + elapsedMilliseconds);
        var steps = pending / StepMilliseconds;
        checked { SimulatedMilliseconds += steps * StepMilliseconds; }
        pending %= StepMilliseconds;
        return steps;
    }
}
