using System;

namespace TailJs.Model;

/// <summary>
/// Events implementing this interface are supporting the infrastructure and should not appear in BI/analytics.
/// </summary>
public interface ISystemEvent : ITrackedEvent
{
}

